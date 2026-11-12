import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import urllib.error
import zipfile

import android_beta as beta


REPOSITORY = "ArtifexEt/Hiciarz"
COMMIT = "a" * 40
FINGERPRINT = "b" * 64
OTHER_FINGERPRINT = "c" * 64
SECTIONS = {"Unreleased": "- A pending scanner fix.", "0.2.0-alpha.7": "- Previous change."}


def plan(**kwargs):
    values = {"repository": REPOSITORY, "commit": COMMIT, "run_number": 25,
              "fingerprint": FINGERPRINT, "github_max": 100_040, "play_max": 100_050}
    values.update(kwargs)
    return beta.make_plan(SECTIONS, **values)


def workflow_event(**changes):
    upstream = {"name": "Check web and Android", "conclusion": "success", "event": "push",
                "head_branch": "main", "head_repository": {"full_name": REPOSITORY}, "head_sha": COMMIT}
    upstream.update(changes)
    return {"workflow_run": upstream}


def internal_release(code, fingerprint=None, *, status="completed"):
    name = beta.fingerprint_release_name(fingerprint) if fingerprint else "Manual initial release"
    return {"name": name, "versionCodes": [str(code)], "status": status,
            "releaseNotes": [{"language": "pl-PL", "text": "Scanner improvements."}]}


class ContextTests(unittest.TestCase):
    def test_accepts_only_successful_main_push_from_same_repository(self):
        self.assertEqual(beta.execution_context("workflow_run", workflow_event(), REPOSITORY,
                                                "refs/heads/main", "true"), COMMIT)
        for changes in ({"conclusion": "failure"}, {"conclusion": "cancelled"}, {"event": "pull_request"},
                        {"head_branch": "feature"}, {"head_repository": {"full_name": "fork/Hiciarz"}},
                        {"head_repository": None}, {"name": "Some other workflow"}, {"head_sha": "short"}):
            with self.subTest(changes=changes), self.assertRaises(beta.BetaError):
                beta.execution_context("workflow_run", workflow_event(**changes), REPOSITORY, "refs/heads/main", "true")

    def test_disabled_real_releases_skip_but_manual_preview_can_prepare_setup(self):
        with self.assertRaisesRegex(beta.BetaError, "PLAY_BETA_ENABLED"):
            beta.execution_context("workflow_run", workflow_event(), REPOSITORY, "refs/heads/main", "")
        with mock.patch.dict(os.environ, {"GITHUB_SHA": COMMIT}):
            self.assertEqual(beta.execution_context("workflow_dispatch", {}, REPOSITORY,
                                                    "refs/heads/main", "", dry_run=True), COMMIT)
            with self.assertRaises(beta.BetaError):
                beta.execution_context("workflow_dispatch", {}, REPOSITORY, "refs/heads/main", "false")
            with self.assertRaises(beta.BetaError):
                beta.execution_context("workflow_dispatch", {}, REPOSITORY, "refs/heads/feature", "true")

    def test_other_events_cannot_publish_even_when_enabled(self):
        for event in ("pull_request", "push", "pull_request_target"):
            with self.subTest(event=event), self.assertRaises(beta.BetaError):
                beta.execution_context(event, {}, REPOSITORY, "refs/heads/main", "true")

    def test_manual_release_requires_green_full_ci_for_exact_main_commit(self):
        run = workflow_event()["workflow_run"]
        payload = json.dumps([{"workflow_runs": [run]}])
        with mock.patch.object(beta.release, "command_output", return_value=payload) as command:
            beta.verify_successful_checks(COMMIT, REPOSITORY)
            self.assertIn(f"head_sha={COMMIT}", command.call_args.args[-1])
        for changes in ({"head_sha": "d" * 40}, {"conclusion": "failure"}, {"event": "pull_request"},
                        {"head_repository": {"full_name": "fork/Hiciarz"}}):
            run = workflow_event(**changes)["workflow_run"]
            with self.subTest(changes=changes), mock.patch.object(beta.release, "command_output", return_value=json.dumps([{"workflow_runs": [run]}])):
                with self.assertRaisesRegex(beta.BetaError, "no successful"):
                    beta.verify_successful_checks(COMMIT, REPOSITORY)

    def test_stale_main_and_wrong_checkout_fail(self):
        with mock.patch.object(beta.release, "command_output", side_effect=[COMMIT, "d" * 40]):
            with self.assertRaisesRegex(beta.BetaError, "Main has advanced"):
                beta.verify_source(COMMIT, REPOSITORY, current_main=True)
        with mock.patch.object(beta.release, "command_output", return_value="d" * 40):
            with self.assertRaisesRegex(beta.BetaError, "checked-out"):
                beta.verify_source(COMMIT, REPOSITORY)


class VersionTests(unittest.TestCase):
    def test_version_code_is_above_every_source_and_respects_manual_floor(self):
        self.assertEqual(beta.next_version_code(25), 100_025)
        self.assertEqual(beta.next_version_code(25, github_max=123_456), 123_457)
        self.assertEqual(beta.next_version_code(25, play_max=234_567, github_max=123_456), 234_568)
        self.assertEqual(beta.next_version_code(25, play_max=234_567, floor=300_000), 300_000)

    def test_invalid_or_exhausted_version_codes_fail_before_upload(self):
        for kwargs in ({"run_number": 0}, {"run_number": True}, {"run_number": beta.MAX_VERSION_CODE},
                       {"run_number": 1, "play_max": beta.MAX_VERSION_CODE},
                       {"run_number": 1, "github_max": -1}, {"run_number": 1, "floor": beta.MAX_VERSION_CODE + 1}):
            with self.subTest(kwargs=kwargs), self.assertRaises(beta.BetaError):
                beta.next_version_code(**kwargs)

    def test_play_maximum_includes_bundles_apks_and_all_track_statuses(self):
        bundles = {"bundles": [{"versionCode": 100_030}, {"versionCode": 100_040}]}
        tracks = {"tracks": [{"track": "production", "releases": [internal_release(500_000, status="halted")]},
                             {"track": "internal", "releases": [internal_release(100_045, status="draft")]}]}
        self.assertEqual(beta.highest_play_code(bundles, tracks, {"apks": [{"versionCode": 600_000}]}), 600_000)
        self.assertEqual(beta.highest_play_code({}, {}, {}), 0)

    def test_malformed_play_version_data_is_not_treated_as_zero(self):
        for bundles, tracks, apks in (({"bundles": None}, {}, {}),
                                     ({"bundles": [{"versionCode": "garbage"}]}, {}, {}),
                                     ({}, {"tracks": [{"releases": [{"versionCodes": "123"}]}]}, {}),
                                     ({}, {}, {"apks": [{"versionCode": True}]})):
            with self.subTest(bundles=bundles, tracks=tracks, apks=apks), self.assertRaises(beta.BetaError):
                beta.highest_play_code(bundles, tracks, apks)


class FingerprintTests(unittest.TestCase):
    TREE = ("100644 blob " + "1" * 40 + "\tandroid-app/app/src/main/AndroidManifest.xml\0"
            "100644 blob " + "2" * 40 + "\tweb/public/themes/disco.svg\0")

    def fingerprint(self, tree=None, client="1234", certificate="AA:BB"):
        with mock.patch.object(beta.release, "command_output", return_value=tree or self.TREE):
            return beta.source_fingerprint(client, certificate)

    def test_fingerprint_covers_full_tracked_content_and_public_build_configuration(self):
        first = self.fingerprint()
        self.assertEqual(first, self.fingerprint(certificate="aa bb"))
        self.assertNotEqual(first, self.fingerprint(client="new-client"))
        self.assertNotEqual(first, self.fingerprint(certificate="CC:DD"))
        self.assertNotEqual(first, self.fingerprint(tree=self.TREE.replace("1" * 40, "3" * 40)))
        self.assertNotEqual(first, self.fingerprint(tree=self.TREE.split("\0")[0] + "\0"))

    def test_web_only_theme_assets_do_not_trigger_beta_but_packaged_assets_do(self):
        web_only = "100644 blob " + "4" * 40 + "\tweb/public/themes/fish.webp\0"
        packaged = web_only.replace("fish.webp", "fish-santa.webp")
        self.assertEqual(self.fingerprint(), self.fingerprint(tree=self.TREE + web_only))
        self.assertNotEqual(self.fingerprint(), self.fingerprint(tree=self.TREE + packaged))

    def test_latest_completed_internal_release_is_the_baseline(self):
        tracks = {"tracks": [{"track": "internal", "releases": [
            internal_release(100_001, FINGERPRINT), internal_release(100_050, OTHER_FINGERPRINT),
            internal_release(100_100, FINGERPRINT, status="draft")]}]}
        self.assertEqual(beta.current_internal_fingerprint(tracks), OTHER_FINGERPRINT)

    def test_no_marker_bootstraps_and_wrong_track_requires_manual_setup(self):
        self.assertIsNone(beta.current_internal_fingerprint({"tracks": [{"track": "internal", "releases": [internal_release(1)]}]}))
        valid = beta.fingerprint_release_name(FINGERPRINT)
        self.assertEqual(len(valid), 48)
        self.assertEqual(beta.release_name_fingerprint(valid), FINGERPRINT)
        # The last character has two padding bits; a permissive decoder would
        # accept the same bytes under this noncanonical name.
        noncanonical = valid[:-1] + "t"
        for name in (None, "", "beta-", valid + "=", valid[:-1], "beta-" + "!" * 43,
                     valid.replace("beta-", "other-"), noncanonical):
            latest = internal_release(10, FINGERPRINT)
            latest["name"] = name
            tracks = {"tracks": [{"track": "internal", "releases": [internal_release(1, FINGERPRINT), latest]}]}
            with self.subTest(name=name):
                self.assertIsNone(beta.current_internal_fingerprint(tracks))
        with self.assertRaisesRegex(beta.BetaError, "first release"):
            beta.current_internal_fingerprint({"tracks": [{"track": "production"}]})


class PlanTests(unittest.TestCase):
    def test_beta_base_and_human_notes_come_from_changelog_without_machine_metadata(self):
        prepared = plan()
        self.assertEqual(prepared["name"], "0.2.0-beta.25")
        self.assertEqual(prepared["code"], 100_051)
        self.assertIn("pending scanner fix", prepared["releaseNotes"][0]["text"])
        self.assertNotIn(FINGERPRINT, prepared["releaseNotes"][0]["text"])
        self.assertNotIn(COMMIT, prepared["releaseNotes"][0]["text"])
        self.assertNotIn("Previous change", prepared["releaseNotes"][0]["text"])
        large = beta.make_plan({"1.0.0": "- " + "Long notes " * 100}, repository=REPOSITORY,
                               commit=COMMIT, run_number=1, fingerprint=FINGERPRINT)
        self.assertLessEqual(len(large["releaseNotes"][0]["text"]), 500)
        self.assertNotIn("fingerprint", large["releaseNotes"][0]["text"])
        self.assertNotIn("commit=", large["releaseNotes"][0]["text"])

    def test_unchanged_production_inputs_are_skipped_independent_of_commit(self):
        self.assertTrue(plan(previous_fingerprint=FINGERPRINT)["skip"])
        self.assertFalse(plan(previous_fingerprint=OTHER_FINGERPRINT)["skip"])

    def test_payload_can_only_complete_internal_and_uses_string_version_code(self):
        prepared = plan()
        payload = beta.internal_payload(prepared)
        self.assertEqual(payload["track"], "internal")
        self.assertEqual(payload["releases"][0]["status"], "completed")
        self.assertEqual(payload["releases"][0]["versionCodes"], ["100051"])
        self.assertEqual(payload["releases"][0]["name"], beta.fingerprint_release_name(FINGERPRINT))
        self.assertEqual(prepared["name"], "0.2.0-beta.25")
        for key, value in (("track", "production"), ("track", "beta"), ("package", "other.app"),
                           ("code", 0), ("provisional", True)):
            invalid = copy.deepcopy(prepared)
            invalid[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(beta.BetaError):
                beta.internal_payload(invalid)


class ApiTests(unittest.TestCase):
    def test_media_uses_upload_endpoint_and_expected_auth_without_retries(self):
        opener = mock.MagicMock()
        opener.open.return_value.__enter__.return_value.read.return_value = b'{"versionCode": 123}'
        api = beta.PlayAPI("short-lived-token", opener)
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "app.aab"
            media.write_bytes(b"bundle")
            api.request("POST", "/edit-1/bundles", media=media, query={"uploadType": "media"})
        request = opener.open.call_args.args[0]
        self.assertIn("/upload/androidpublisher/v3/applications/pl.artifex.hiciarz/edits/edit-1/bundles?uploadType=media", request.full_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer short-lived-token")
        self.assertEqual(request.data, b"bundle")
        opener.open.assert_called_once()

    def test_api_errors_do_not_echo_tokens_or_server_response_and_are_not_retried(self):
        opener = mock.Mock()
        opener.open.side_effect = urllib.error.HTTPError("https://example.invalid/token-secret", 503,
                                                        "token-secret", {}, io.BytesIO(b"token-secret"))
        api = beta.PlayAPI("token-secret", opener)
        with self.assertRaises(beta.PlayError) as failure:
            api.request("POST", "/edit-1:commit")
        self.assertIn("HTTP 503", str(failure.exception))
        self.assertNotIn("token-secret", str(failure.exception))
        opener.open.assert_called_once()

    def test_version_snapshot_uses_bundles_tracks_and_apks(self):
        api = beta.PlayAPI("token", mock.Mock())
        with mock.patch.object(api, "request", side_effect=[{"bundles": [{"versionCode": 4}]},
                                {"tracks": [{"track": "internal", "releases": [internal_release(5, FINGERPRINT)]}]},
                                {"apks": [{"versionCode": 6}]}]) as request:
            self.assertEqual(api.snapshot("edit-1"), {"maximum": 6, "fingerprint": FINGERPRINT})
        self.assertEqual([call.args[1] for call in request.call_args_list],
                         ["/edit-1/bundles", "/edit-1/tracks", "/edit-1/apks"])

    def test_snapshot_edit_is_discarded_without_commit_even_after_read_failure(self):
        api = mock.Mock()
        api.insert.return_value = "edit-1"
        api.snapshot.side_effect = beta.PlayError("Read failed")
        with self.assertRaises(beta.PlayError):
            beta.play_snapshot(api)
        api.delete.assert_called_once_with("edit-1")
        api.request.assert_not_called()


class PublishTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.bundle = Path(self.temporary.name) / "app.aab"
        self.mapping = Path(self.temporary.name) / "mapping.txt"
        self.mapping.write_bytes(b"test R8 mapping")
        with zipfile.ZipFile(self.bundle, "w") as archive:
            archive.writestr("BundleConfig.pb", b"config")
            archive.writestr("base/manifest/AndroidManifest.xml", b"manifest")
            archive.writestr(beta.MAPPING_ENTRY, self.mapping.read_bytes())
        self.digest = hashlib.sha256(self.bundle.read_bytes()).hexdigest()
        self.plan = plan()
        self.api = mock.Mock()
        self.api.insert.return_value = "edit-1"
        self.api.snapshot.return_value = {"maximum": 100_050, "fingerprint": None}
        self.api.request.side_effect = [
            {"versionCode": 100_051, "sha256": self.digest}, beta.internal_payload(self.plan), {"id": "edit-1"}]
        self.source_check = mock.Mock()

    def publish(self):
        return beta.publish(self.api, self.plan, self.bundle, self.mapping, check_source=self.source_check)

    def test_transaction_uploads_verifies_updates_only_internal_and_commits_once(self):
        receipt = self.publish()
        self.assertEqual(receipt["status"], "committed")
        self.assertEqual(receipt["sha256"], self.digest)
        self.assertEqual(self.source_check.call_count, 2)
        calls = self.api.request.call_args_list
        self.assertEqual([(call.args[0], call.args[1]) for call in calls],
                         [("POST", "/edit-1/bundles"), ("PUT", "/edit-1/tracks/internal"), ("POST", "/edit-1:commit")])
        self.assertEqual(calls[1].kwargs["data"]["releases"][0]["status"], "completed")
        self.assertEqual(calls[2].kwargs["query"], {"changesInReviewBehavior": "ERROR_IF_IN_REVIEW"})
        self.api.delete.assert_not_called()

    def test_uncertain_commit_is_not_retried_or_deleted(self):
        self.api.request.side_effect = [{"versionCode": 100_051, "sha256": self.digest},
                                        beta.internal_payload(self.plan), beta.PlayError("No confirmed response")]
        with self.assertRaisesRegex(beta.BetaError, "Inspect Play Console before another run"):
            self.publish()
        self.assertEqual(self.api.request.call_count, 3)
        self.api.delete.assert_not_called()

    def test_upload_failure_is_not_retried_and_uncommitted_edit_is_discarded(self):
        self.api.request.side_effect = beta.PlayError("Upload failed")
        with self.assertRaisesRegex(beta.PlayError, "Upload failed"):
            self.publish()
        self.api.request.assert_called_once()
        self.api.delete.assert_called_once_with("edit-1")

    def test_uploaded_version_or_digest_mismatch_never_updates_any_track(self):
        for response in ({"versionCode": 999, "sha256": self.digest},
                         {"versionCode": 100_051, "sha256": "wrong-digest"}):
            with self.subTest(response=response):
                self.api.reset_mock()
                self.api.request.side_effect = [response]
                with self.assertRaisesRegex(beta.BetaError, "does not match"):
                    self.publish()
                self.api.request.assert_called_once()
                self.api.delete.assert_called_once_with("edit-1")

    def test_stale_source_after_upload_prevents_commit(self):
        self.source_check.side_effect = [None, beta.BetaError("Main has advanced")]
        with self.assertRaisesRegex(beta.BetaError, "Main has advanced"):
            self.publish()
        self.assertEqual(self.api.request.call_count, 2)
        self.api.delete.assert_called_once_with("edit-1")

    def test_stale_source_before_upload_does_not_open_an_edit(self):
        self.source_check.side_effect = beta.BetaError("Main has advanced")
        with self.assertRaises(beta.BetaError):
            self.publish()
        self.api.insert.assert_not_called()

    def test_another_release_consuming_the_code_is_rejected_before_upload(self):
        self.api.snapshot.return_value["maximum"] = 100_051
        with self.assertRaisesRegex(beta.BetaError, "no longer above"):
            self.publish()
        self.api.request.assert_not_called()
        self.api.delete.assert_called_once_with("edit-1")

    def test_current_internal_fingerprint_skips_upload(self):
        self.api.snapshot.return_value["fingerprint"] = FINGERPRINT
        self.assertEqual(self.publish()["status"], "skipped")
        self.api.request.assert_not_called()
        self.api.delete.assert_called_once_with("edit-1")

    def test_incorrect_track_response_does_not_commit(self):
        self.api.request.side_effect = [{"versionCode": 100_051, "sha256": self.digest}, {"track": "production", "releases": []}]
        with self.assertRaisesRegex(beta.BetaError, "expected completed internal"):
            self.publish()
        self.assertEqual(self.api.request.call_count, 2)
        self.api.delete.assert_called_once_with("edit-1")

    def test_mapping_from_a_different_build_is_rejected_before_api_calls(self):
        self.mapping.write_bytes(b"different build")
        with self.assertRaisesRegex(beta.BetaError, "mapping does not match"):
            self.publish()
        self.api.insert.assert_not_called()


class PreviewTests(unittest.TestCase):
    def test_preview_never_authenticates_or_mutates_play_and_marks_code_provisional(self):
        with tempfile.TemporaryDirectory() as directory:
            changelog = Path(directory) / "CHANGELOG.md"
            changelog.write_text("## [0.2.0-alpha.7]\n- Scanner fix.\n", encoding="utf-8")
            output = Path(directory) / "artifacts"
            with mock.patch.object(beta, "workflow_commit", return_value=COMMIT), \
                 mock.patch.object(beta, "verify_source"), \
                 mock.patch.object(beta, "source_fingerprint", return_value=FINGERPRINT), \
                 mock.patch.object(beta, "github_max_code", return_value=100_040), \
                 mock.patch.object(beta, "PlayAPI") as api, \
                 mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": REPOSITORY, "GITHUB_RUN_NUMBER": "25",
                                              "PLAY_VERSION_CODE_FLOOR": "", "GITHUB_OUTPUT": "", "GITHUB_STEP_SUMMARY": ""}), \
                 contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(beta.main(["preview", "--changelog", str(changelog), "--output-dir", str(output)]), 0)
            api.assert_not_called()
            prepared = json.loads((output / "RELEASE-PLAN.json").read_text(encoding="utf-8"))
            self.assertTrue(prepared["provisional"])
            self.assertEqual(prepared["code"], 100_041)
            self.assertTrue((output / "RELEASE-NOTES.md").is_file())


if __name__ == "__main__":
    unittest.main()
