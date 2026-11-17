import base64
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
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
TEST_OPENSSL = shutil.which(os.environ.get("HICIARZ_TEST_OPENSSL", "openssl"))


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

    def fingerprint(self, tree=None, client="1234", certificate="AA:BB", analytics=""):
        with mock.patch.object(beta.release, "command_output", return_value=tree or self.TREE):
            return beta.source_fingerprint(client, certificate, analytics)

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

    def test_play_fingerprint_changes_only_with_packaged_analytics_configuration(self):
        config = {"project_info": {"project_number": "123", "project_id": "sample-release"}, "client": [
            {"client_info": {"mobilesdk_app_id": "1:123:android:123abc",
                             "android_client_info": {"package_name": beta.PACKAGE}},
             "api_key": [{"current_key": "AIza" + "a" * 35}]}]}

        def encode():
            return base64.b64encode(json.dumps(config).encode()).decode()

        first = self.fingerprint(analytics=encode())
        self.assertNotEqual(first, self.fingerprint())
        config["project_info"]["storage_bucket"] = "irrelevant"
        self.assertEqual(first, self.fingerprint(analytics=encode()))
        config["client"][0]["api_key"][0]["current_key"] = "AIza" + "b" * 35
        self.assertNotEqual(first, self.fingerprint(analytics=encode()))

    def test_latest_completed_internal_release_is_the_baseline(self):
        tracks = {"tracks": [{"track": "internal", "releases": [
            internal_release(100_001, FINGERPRINT), internal_release(100_050, OTHER_FINGERPRINT)]}]}
        self.assertEqual(beta.current_internal_fingerprint(tracks), OTHER_FINGERPRINT)

    def test_existing_internal_draft_or_in_progress_release_blocks_publishing(self):
        for status in ("draft", "inProgress", "halted"):
            tracks = {"tracks": [{"track": "internal", "releases": [
                internal_release(100_020, FINGERPRINT), internal_release(100_021, status=status)]}]}
            with self.subTest(status=status), self.assertRaisesRegex(beta.BetaError, "pending internal testing release"):
                beta.current_internal_fingerprint(tracks)

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
        with self.assertRaisesRegex(beta.BetaError, "first internal release"):
            beta.current_internal_fingerprint({"tracks": [{"track": "internal", "releases": [
                internal_release(100_020, status="draft")]}]})


class PlanTests(unittest.TestCase):
    def test_beta_base_and_human_notes_come_from_changelog_without_machine_metadata(self):
        prepared = plan()
        self.assertEqual(prepared["name"], "0.2.0-beta.51")
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

    def test_first_automated_release_follows_manual_beta_code_and_name(self):
        prepared = plan(run_number=1, github_max=100_009, play_max=100_020)
        self.assertEqual(prepared["name"], "0.2.0-beta.21")
        self.assertEqual(prepared["code"], 100_021)

    def test_live_plan_handoff_remains_bounded_with_a_long_changelog(self):
        prepared = plan()
        prepared["notes"] = "- Zmiany w aplikacji.\n" * 10_000
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            beta.write_plan(prepared, destination)
            encoded = (destination / "RELEASE-PLAN.json").read_bytes()
            self.assertLessEqual(len(encoded), beta.firebase.MAX_HANDOFF_PLAN)
            self.assertNotIn("notes", json.loads(encoded))
            self.assertEqual(json.loads(encoded)["releaseNotes"], prepared["releaseNotes"])

    def test_payload_can_only_complete_internal_and_uses_string_version_code(self):
        prepared = plan()
        payload = beta.internal_payload(prepared)
        self.assertEqual(payload["track"], "internal")
        self.assertEqual(payload["releases"][0]["status"], "completed")
        self.assertEqual(payload["releases"][0]["versionCodes"], ["100051"])
        self.assertEqual(payload["releases"][0]["name"], beta.fingerprint_release_name(FINGERPRINT))
        self.assertEqual(prepared["name"], "0.2.0-beta.51")
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
        self.assertNotIn("editId", receipt)
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
        with self.assertRaisesRegex(beta.BetaError, "Inspect Play Console before another run") as failure:
            self.publish()
        self.assertNotIn("edit-1", str(failure.exception))
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

    def test_builder_handoff_rejects_existing_signatures(self):
        self.assertEqual(beta.validate_bundle(self.bundle, self.mapping, unsigned=True), self.digest)
        with zipfile.ZipFile(self.bundle, "a") as archive:
            archive.writestr("META-INF/DEBUG.RSA", b"test signature")
        with self.assertRaisesRegex(beta.BetaError, "must be unsigned"):
            beta.validate_bundle(self.bundle, unsigned=True)


class SigningTests(unittest.TestCase):
    def test_requires_one_matching_upload_certificate(self):
        expected = "a1" * 32
        certificate_line = "\t SHA256: " + ":".join(["A1"] * 32)
        beta.verify_upload_certificate(certificate_line, expected)
        for text in ("", certificate_line + "\n" + certificate_line, certificate_line.replace("A1", "A2")):
            with self.subTest(text=text), self.assertRaisesRegex(beta.BetaError, "one matching upload certificate"):
                beta.verify_upload_certificate(text, expected)


class HandoffTests(unittest.TestCase):
    def test_handoff_and_upload_certificates_must_be_separate(self):
        with mock.patch.dict(os.environ, {"PLAY_HANDOFF_CERT_SHA256": FINGERPRINT, "PLAY_UPLOAD_CERT_SHA256": FINGERPRINT}):
            with self.assertRaisesRegex(beta.BetaError, "dedicated handoff certificate"):
                beta.configured_handoff_certificate()

    def test_only_the_exact_same_run_play_bundle_is_accepted(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("bundle.cms", b"test CMS")
        payload = buffer.getvalue()
        digest = hashlib.sha256(payload).hexdigest()
        metadata = {"id": 42, "name": "android-play-beta-sealed-99-1", "expired": False,
                    "size_in_bytes": len(payload), "digest": "sha256:" + digest, "workflow_run": {"id": 99}}
        with mock.patch.dict(os.environ, {"HANDOFF_ARTIFACT_ID": "42", "HANDOFF_ARTIFACT_DIGEST": digest,
                                          "GITHUB_RUN_ID": "99"}), \
             mock.patch.object(beta.firebase, "gh_json", return_value=metadata), \
             mock.patch.object(beta.firebase, "gh_bytes", return_value=payload):
            self.assertEqual(beta.receive_handoff(REPOSITORY, "sealed"), b"test CMS")
            with self.assertRaisesRegex(beta.firebase.FirebaseError, "Invalid same-run"):
                beta.receive_handoff(REPOSITORY, "unsigned")
            metadata["name"] = "android-firebase-beta-unsigned-99-1"
            with self.assertRaisesRegex(beta.firebase.FirebaseError, "does not match this run"):
                beta.receive_handoff(REPOSITORY, "sealed")

    @unittest.skipUnless(TEST_OPENSSL, "OpenSSL is required to exercise the encrypted AAB handoff")
    def test_real_cms_handoff_encrypts_round_trip_and_authenticates_the_aab(self):
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(beta, "OPENSSL_EXECUTABLE", TEST_OPENSSL):
            folder = Path(directory)
            certificate, key = folder / "certificate.pem", folder / "synthetic-key.pem"
            beta.openssl("req", "-x509", "-newkey", "rsa:2048", "-noenc", "-batch", "-days", "1",
                         "-subj", "/CN=Synthetic Play handoff", "-keyout", key, "-out", certificate)
            fingerprint = hashlib.sha256(beta.openssl("x509", "-in", certificate, "-outform", "DER")).hexdigest()
            source, artifact, restored = (folder / name for name in ("build.aab", "bundle.cms", "restored.aab"))
            sentinel = b"synthetic-client-configuration"
            with zipfile.ZipFile(source, "w") as archive:
                archive.writestr("BundleConfig.pb", b"test bundle config")
                archive.writestr("base/manifest/AndroidManifest.xml", b"test manifest")
                archive.writestr("base/dex/classes.dex", sentinel)
                archive.writestr(beta.MAPPING_ENTRY, b"test mapping")
            credentials = {beta.PUBLIC_CERTIFICATE_SECRET: base64.b64encode(certificate.read_bytes()).decode(),
                           beta.PRIVATE_KEY_SECRET: base64.b64encode(key.read_bytes()).decode()}
            with mock.patch.dict(os.environ, credentials):
                with mock.patch.dict(os.environ, {beta.PRIVATE_KEY_SECRET: ""}):
                    with self.assertRaisesRegex(beta.BetaError, "certificate does not match"):
                        beta.seal_bundle(source, artifact, "0" * 64)
                    self.assertFalse(artifact.exists())
                    beta.seal_bundle(source, artifact, fingerprint)
                sealed = artifact.read_bytes()
                self.assertNotIn(sentinel, sealed)
                self.assertFalse(zipfile.is_zipfile(artifact))
                envelope = beta.openssl("cms", "-cmsout", "-print", "-inform", "DER", "-in", artifact)
                for scheme in (b"authEnvelopedData", b"rsaesOaep", b"aes-256-gcm", b"sha256"):
                    self.assertIn(scheme.lower(), envelope.lower())
                beta.unseal_bundle(sealed, restored, fingerprint)
                self.assertEqual(source.read_bytes(), restored.read_bytes())
                restored.unlink()
                tampered = sealed[:-1] + bytes([sealed[-1] ^ 1])
                with self.assertRaisesRegex(beta.BetaError, "OpenSSL could not process"):
                    beta.unseal_bundle(tampered, restored, fingerprint)
                self.assertFalse(restored.exists())


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
