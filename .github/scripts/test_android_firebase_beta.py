import copy
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest import mock
import urllib.error
import zipfile

import android_firebase_beta as beta


REPOSITORY = "example/project"
COMMIT = "a" * 40
FINGERPRINT = "b" * 64
APP_ID = "1:123456789:android:0123456789abcdef"
APP = "projects/123456789/apps/" + APP_ID
RELEASE = APP + "/releases/example"
OPERATION = APP + "/releases/-/operations/example"
SECTIONS = {"Unreleased": "- Improve scanning.", "0.2.0-alpha.7": "- A previous fix."}


def event(**changes):
    run = {"name": "Check web and Android", "conclusion": "success", "event": "push",
           "head_branch": "main", "head_repository": {"full_name": REPOSITORY}, "head_sha": COMMIT}
    run.update(changes)
    return {"workflow_run": run}


def plan(**changes):
    values = {"commit": COMMIT, "repository": REPOSITORY, "run_number": 25, "fingerprint": FINGERPRINT,
              "github_max": 100_040, "firebase_releases": [{"buildVersion": "100050"}]}
    values.update(changes)
    return beta.make_plan(SECTIONS, **values)


def run(**changes):
    value = {"id": 20, "path": beta.WORKFLOW, "status": "completed", "conclusion": "success",
             "event": "workflow_run", "head_branch": "main", "head_sha": COMMIT,
             "repository": {"full_name": REPOSITORY}, "head_repository": {"full_name": REPOSITORY}}
    value.update(changes)
    return value


def state_zip(state=None, *, filename="state.json", extra=False):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(filename, json.dumps(state or plan()["state"]))
        if extra:
            archive.writestr("extra", "unexpected")
    return buffer.getvalue()


def fixture_apk(path):
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("AndroidManifest.xml", "manifest")
        archive.writestr("classes.dex", "code")


class CertificateTests(unittest.TestCase):
    DIGEST = "ab" * 32

    def test_old_and_current_sdk_signer_formats_match_the_expected_certificate(self):
        for prefix in ("Signer #1 certificate", "V2 Signer: certificate", "V3 Signer: certificate",
                       "V3.1 Signer: certificate", "V4 Signer #1: certificate"):
            with self.subTest(prefix=prefix):
                beta.verify_signing_certificate(f"{prefix} SHA-256 digest: {self.DIGEST.upper()}\n".encode(), self.DIGEST)

    def test_same_certificate_repeated_across_signing_schemes_is_deduplicated(self):
        raw = (f"Signer #1 certificate SHA-256 digest: {self.DIGEST}\n"
               f"V2 Signer: certificate SHA-256 digest: {self.DIGEST.upper()}\n"
               f"V3 Signer: certificate SHA-256 digest: {self.DIGEST}\n").encode()
        beta.verify_signing_certificate(raw, ":".join(["AB"] * 32))

    def test_missing_wrong_or_multiple_unique_certificates_fail_closed(self):
        cases = (b"", b"Signer #1 certificate SHA-1 digest: irrelevant\n",
                 f"V2 Signer: certificate SHA-256 digest: {'cd' * 32}\n".encode(),
                 (f"Signer #1 certificate SHA-256 digest: {self.DIGEST}\n"
                  f"Signer #2 certificate SHA-256 digest: {'cd' * 32}\n").encode(),
                 (f"V2 Signer: certificate SHA-256 digest: {self.DIGEST}\n"
                  f"V3 Signer: certificate SHA-256 digest: {'cd' * 32}\n").encode())
        for raw in cases:
            with self.subTest(raw=raw[:30]), self.assertRaises(beta.FirebaseError):
                beta.verify_signing_certificate(raw, self.DIGEST)

    def test_any_malformed_signer_digest_fails_even_alongside_a_valid_scheme(self):
        for malformed in ("ab" * 31, "gg" * 32, "ab" * 33, self.DIGEST + " unexpected", ""):
            raw = (f"V2 Signer: certificate SHA-256 digest: {self.DIGEST}\n"
                   f"V3 Signer: certificate SHA-256 digest: {malformed}\n").encode()
            with self.subTest(malformed=malformed), self.assertRaises(beta.FirebaseError):
                beta.verify_signing_certificate(raw, self.DIGEST)

    def test_invalid_expected_digest_invalid_text_and_oversized_output_are_rejected(self):
        raw = f"V2 Signer: certificate SHA-256 digest: {self.DIGEST}\n".encode()
        for expected in ("", "invalid-private-value", "ab" * 31, None):
            with self.subTest(expected=expected), self.assertRaises(beta.FirebaseError):
                beta.verify_signing_certificate(raw, expected)
        for value in (b"\xff", b"a" * (beta.MAX_CERTIFICATE_OUTPUT + 1)):
            with self.subTest(value=value[:30]), self.assertRaises(beta.FirebaseError):
                beta.verify_signing_certificate(value, self.DIGEST)

    def test_cli_verifies_bounded_stdin_before_loading_workflow_or_firebase_configuration(self):
        stdin = mock.Mock()
        stdin.buffer.read.return_value = f"V2 Signer: certificate SHA-256 digest: {self.DIGEST}\n".encode()
        stdout = io.StringIO()
        with mock.patch.object(beta.sys, "stdin", stdin), mock.patch.dict(os.environ, {"ANDROID_SIGNING_CERT_SHA256": self.DIGEST}, clear=True), \
             mock.patch.object(beta, "verify_source") as verify_source, contextlib.redirect_stdout(stdout):
            self.assertEqual(beta.main(["verify-certificate"]), 0)
        stdin.buffer.read.assert_called_once_with(beta.MAX_CERTIFICATE_OUTPUT + 1)
        verify_source.assert_not_called()
        self.assertNotIn(self.DIGEST, stdout.getvalue())

    def test_cli_failure_reports_only_safe_text_without_raw_certificate_output(self):
        raw = f"V2 Signer: certificate SHA-256 digest: {self.DIGEST}\nprivate-response".encode()
        stderr = io.StringIO()
        with mock.patch.object(beta.sys, "stdin", types.SimpleNamespace(buffer=io.BytesIO(raw))), \
             mock.patch.dict(os.environ, {"ANDROID_SIGNING_CERT_SHA256": "cd" * 32}, clear=True), contextlib.redirect_stderr(stderr):
            self.assertEqual(beta.main(["verify-certificate"]), 1)
        self.assertNotIn(self.DIGEST, stderr.getvalue())
        self.assertNotIn("private-response", stderr.getvalue())


class ContextTests(unittest.TestCase):
    def test_only_successful_same_repository_main_push_or_manual_main_is_accepted(self):
        self.assertEqual(beta.execution_context("workflow_run", event(), REPOSITORY, "refs/heads/main", "true"), COMMIT)
        for changes in ({"conclusion": "failure"}, {"conclusion": "cancelled"}, {"event": "pull_request"},
                        {"head_branch": "feature"}, {"head_repository": {"full_name": "fork/project"}},
                        {"head_repository": None}, {"name": "Other checks"}, {"head_sha": "short"}):
            with self.subTest(changes=changes), self.assertRaises(beta.FirebaseError):
                beta.execution_context("workflow_run", event(**changes), REPOSITORY, "refs/heads/main", "true")
        for event_name in ("pull_request", "pull_request_target", "push"):
            with self.subTest(event_name=event_name), self.assertRaises(beta.FirebaseError):
                beta.execution_context(event_name, {}, REPOSITORY, "refs/heads/main", "true", sha=COMMIT)
        with self.assertRaises(beta.FirebaseError):
            beta.execution_context("workflow_run", event(), REPOSITORY, "refs/heads/feature", "true")

    def test_disabled_pipeline_allows_only_explicit_manual_preview(self):
        self.assertEqual(beta.execution_context("workflow_dispatch", {}, REPOSITORY, "refs/heads/main", "",
                                                preview=True, sha=COMMIT), COMMIT)
        with self.assertRaises(beta.FirebaseError):
            beta.execution_context("workflow_dispatch", {}, REPOSITORY, "refs/heads/main", "", sha=COMMIT)
        with self.assertRaises(beta.FirebaseError):
            beta.execution_context("workflow_run", event(), REPOSITORY, "refs/heads/main", "", preview=True)

    def test_checkout_and_current_main_are_verified(self):
        with mock.patch.object(beta.release, "command_output", return_value=COMMIT), \
             mock.patch.object(beta, "gh_json", return_value={"object": {"sha": "c" * 40}}):
            with self.assertRaisesRegex(beta.FirebaseError, "Main has advanced"):
                beta.verify_source(COMMIT, REPOSITORY)
        with mock.patch.object(beta.release, "command_output", return_value="c" * 40):
            with self.assertRaisesRegex(beta.FirebaseError, "checkout"):
                beta.verify_source(COMMIT, REPOSITORY, current_main=False)

    def test_manual_live_run_needs_green_checks_for_exact_sha(self):
        checked = event()["workflow_run"]
        with mock.patch.object(beta, "gh_json", return_value={"workflow_runs": [checked]}):
            beta.verify_successful_checks(COMMIT, REPOSITORY)
        for changes in ({"event": "pull_request"}, {"head_sha": "d" * 40}, {"conclusion": "failure"}):
            with mock.patch.object(beta, "gh_json", return_value={"workflow_runs": [event(**changes)["workflow_run"]]}):
                with self.assertRaises(beta.FirebaseError):
                    beta.verify_successful_checks(COMMIT, REPOSITORY)


class ConfigurationTests(unittest.TestCase):
    def test_explicit_own_configuration_required_without_echoing_values(self):
        config = {"FIREBASE_APP_ID": APP_ID, "FIREBASE_PROJECT_ID": "example-project",
                  "FIREBASE_WORKLOAD_IDENTITY_PROVIDER": "projects/123456789/locations/global/workloadIdentityPools/beta/providers/github",
                  "FIREBASE_SERVICE_ACCOUNT": "publisher@example-project.iam.gserviceaccount.com",
                  "FIREBASE_TESTER_GROUPS": "beta", "SPOTIFY_CLIENT_ID": "a" * 32,
                  "ANDROID_SIGNING_CERT_SHA256": "b" * 64}
        beta.validate_config(config)
        for key in config:
            with self.subTest(key=key), self.assertRaises(beta.FirebaseError) as error:
                beta.validate_config({**config, key: "private-invalid-value\n"})
            self.assertNotIn("private-invalid-value", str(error.exception))
        for value in ("", "beta,beta", "beta,", "beta, private@example.test", "beta\nother"):
            with self.subTest(value=value), self.assertRaises(beta.FirebaseError):
                beta.tester_groups(value)


class FingerprintTests(unittest.TestCase):
    TREE = "100644 blob " + "1" * 40 + "\tandroid-app/app/src/main/AndroidManifest.xml\0"

    def fingerprint(self, tree=None, client="a" * 32, cert="AA:BB", app=APP_ID):
        with mock.patch.object(beta.release, "command_output", return_value=tree or self.TREE):
            return beta.source_fingerprint(client, cert, app)

    def test_only_packaged_android_and_selected_theme_inputs_are_included(self):
        first = self.fingerprint()
        theme = "100644 blob " + "2" * 40 + "\tweb/public/themes/fish.webp\0"
        self.assertEqual(first, self.fingerprint(self.TREE + theme))
        self.assertNotEqual(first, self.fingerprint(self.TREE + theme.replace("fish.webp", "fish-santa.webp")))
        self.assertEqual(first, self.fingerprint(self.TREE + theme.replace("fish.webp", "._fish.svg")))
        self.assertNotEqual(first, self.fingerprint(self.TREE.replace("1" * 40, "3" * 40)))
        self.assertNotIn("web/examples/playlists", beta.FINGERPRINT_PATHS)
        self.assertNotIn(".github/workflows/android-beta.yml", beta.FINGERPRINT_PATHS)
        self.assertNotIn("android-app/docs", beta.FINGERPRINT_PATHS)
        self.assertIn(beta.WORKFLOW, beta.FINGERPRINT_PATHS)

    def test_configuration_changes_trigger_release_without_disclosing_configuration(self):
        first = self.fingerprint()
        self.assertEqual(first, self.fingerprint(cert="aabb"))
        self.assertNotEqual(first, self.fingerprint(client="c" * 32))
        self.assertNotEqual(first, self.fingerprint(cert="CC:DD"))
        self.assertNotEqual(first, self.fingerprint(app=APP_ID.replace("123456789", "987654321")))
        self.assertRegex(first, r"^[a-f0-9]{64}$")


class StateTests(unittest.TestCase):
    def test_archive_only_reads_exact_bounded_json_without_extraction(self):
        self.assertEqual(beta.read_state_archive(state_zip()), plan()["state"])
        for raw in (state_zip(filename="../state.json"), state_zip(extra=True), b"invalid", b"a" * 33000):
            with self.subTest(raw=raw[:30]), self.assertRaises(beta.FirebaseError):
                beta.read_state_archive(raw)
        bad = plan()["state"] | {"private": "not-allowed"}
        with self.assertRaises(beta.FirebaseError):
            beta.read_state_archive(state_zip(bad))
        with self.assertRaises(beta.FirebaseError):
            beta.read_state_archive(state_zip(plan()["state"] | {"code": True}))
        with self.assertRaises(beta.FirebaseError):
            beta.read_state_archive(state_zip(plan()["state"] | {"schema": True}))

    def test_untrusted_publisher_runs_are_rejected(self):
        self.assertTrue(beta.trusted_publisher_run(run(), REPOSITORY, COMMIT))
        for changes in ({"path": ".github/workflows/ci.yml"}, {"conclusion": "failure"}, {"status": "in_progress"},
                        {"event": "pull_request"}, {"head_branch": "feature"}, {"head_sha": "c" * 40},
                        {"head_repository": {"full_name": "fork/project"}}, {"repository": {"full_name": "fork/project"}}):
            with self.subTest(changes=changes):
                self.assertFalse(beta.trusted_publisher_run(run(**changes), REPOSITORY, COMMIT))

    def artifact(self, raw, **changes):
        value = {"id": 10, "name": beta.STATE_ARTIFACT, "expired": False, "workflow_run": {"id": 20},
                 "size_in_bytes": len(raw), "digest": "sha256:" + hashlib.sha256(raw).hexdigest()}
        value.update(changes)
        return value

    def previous(self, artifact=None, state=None, publisher=None):
        state = state or plan()["state"]
        raw = state_zip(state)
        releases = [{"buildVersion": str(state["code"]), "displayVersion": state["name"]}]
        with mock.patch.object(beta, "gh_json", side_effect=[{"workflow_runs": [publisher or run()]}, {"artifacts": [artifact or self.artifact(raw)]}]), \
             mock.patch.object(beta, "gh_bytes", return_value=raw), mock.patch.dict(os.environ, {"GITHUB_RUN_ID": "99"}):
            return beta.previous_fingerprint(REPOSITORY, releases)

    def test_state_requires_archive_digest_matching_trusted_run_and_latest_version(self):
        self.assertEqual(self.previous(), FINGERPRINT)
        raw = state_zip()
        for change in ({"expired": True}, {"name": "other"}, {"size_in_bytes": 33000},
                       {"digest": "sha256:" + "0" * 64}):
            with self.subTest(change=change):
                self.assertIsNone(self.previous(artifact=self.artifact(raw, **change)))
        self.assertIsNone(self.previous(publisher=run(event="pull_request")))
        self.assertIsNone(self.previous(publisher=run(head_sha="d" * 40)))

    def test_missing_state_always_rebuilds_and_no_firebase_release_skips_github_lookup(self):
        with mock.patch.object(beta, "gh_json", return_value={"workflow_runs": []}):
            self.assertIsNone(beta.previous_fingerprint(REPOSITORY, [{"buildVersion": "1", "displayVersion": "manual"}]))
        with mock.patch.object(beta, "gh_json") as request:
            self.assertIsNone(beta.previous_fingerprint(REPOSITORY, []))
            request.assert_not_called()

    def test_lookup_paginates_past_many_skipped_runs_without_trusting_global_names(self):
        state = plan()["state"]
        raw = state_zip(state)
        first_page = [run(id=100 + index) for index in range(100)]
        endpoints = []

        def metadata(repository, endpoint):
            endpoints.append(endpoint)
            if endpoint.endswith("runs?per_page=100&page=1"):
                return {"workflow_runs": first_page}
            if endpoint.endswith("runs?per_page=100&page=2"):
                return {"workflow_runs": [run()]}
            if endpoint == "actions/runs/20/artifacts?per_page=100":
                return {"artifacts": [self.artifact(raw)]}
            return {"artifacts": []}

        with mock.patch.object(beta, "gh_json", side_effect=metadata), mock.patch.object(beta, "gh_bytes", return_value=raw), \
             mock.patch.dict(os.environ, {"GITHUB_RUN_ID": "99"}):
            self.assertEqual(beta.previous_fingerprint(REPOSITORY, [{"buildVersion": str(state["code"]), "displayVersion": state["name"]}]), FINGERPRINT)
        self.assertTrue(any("page=2" in endpoint for endpoint in endpoints))
        self.assertFalse(any(endpoint.startswith("actions/artifacts?") for endpoint in endpoints))

    def test_exhausted_history_limit_fails_closed_instead_of_publishing_duplicate(self):
        def metadata(repository, endpoint):
            return {"workflow_runs": [run(conclusion="failure")] * 100}

        with mock.patch.object(beta, "gh_json", side_effect=metadata):
            with self.assertRaisesRegex(beta.FirebaseError, "history exceeded"):
                beta.previous_fingerprint(REPOSITORY, [{"buildVersion": "1", "displayVersion": "manual"}])


class VersionTests(unittest.TestCase):
    def test_version_is_above_firebase_and_github_and_manual_floor(self):
        self.assertEqual(plan()["state"]["code"], 100_051)
        self.assertEqual(plan(github_max=300_000)["state"]["code"], 300_001)
        self.assertEqual(plan(floor=400_000)["state"]["code"], 400_000)
        with self.assertRaises(beta.FirebaseError):
            plan(github_max=beta.release.MAX_VERSION_CODE)

    def test_only_equal_input_fingerprint_skips_and_notes_have_no_machine_state(self):
        value = plan(previous=FINGERPRINT)
        self.assertTrue(value["skip"])
        self.assertFalse(plan()["skip"])
        self.assertIn("Improve scanning.", value["notes"])
        for machine_value in (COMMIT, FINGERPRINT, APP_ID, "sourceFingerprint"):
            self.assertNotIn(machine_value, value["notes"])
        with self.assertRaises(beta.FirebaseError):
            beta.validate_plan(value, live=True)
        with self.assertRaises(beta.FirebaseError):
            beta.validate_plan(plan(firebase_releases=None), live=True)


class HandoffTests(unittest.TestCase):
    def archive(self, name="plan.json", data=None, extra=False):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr(name, data or json.dumps(plan()).encode())
            if extra:
                archive.writestr("unexpected", "must not extract")
        return buffer.getvalue()

    def receive(self, raw=None, changes=None, kind="plan", digest=None):
        raw = self.archive() if raw is None else raw
        digest = digest or hashlib.sha256(raw).hexdigest()
        metadata = {"id": 42, "name": f"android-firebase-beta-{kind}-99-1", "expired": False,
                    "size_in_bytes": len(raw), "digest": "sha256:" + digest, "workflow_run": {"id": 99}}
        metadata.update(changes or {})
        with mock.patch.object(beta, "gh_json", return_value=metadata), mock.patch.object(beta, "gh_bytes", return_value=raw):
            return beta.receive_handoff(REPOSITORY, "42", digest, "99", kind)

    def test_exact_producer_id_digest_and_same_run_are_required_including_failed_job_retries(self):
        self.assertEqual(json.loads(self.receive()), plan())
        for changes in ({"id": 43}, {"id": True}, {"expired": True}, {"workflow_run": {"id": 98}},
                        {"workflow_run": None}, {"size_in_bytes": beta.MAX_STATE_ZIP + 1},
                        {"name": "android-firebase-beta-plan-98-1"}, {"name": None},
                        {"name": "android-firebase-beta-unsigned-99-1"}, {"digest": "sha256:" + "0" * 64}):
            with self.subTest(changes=changes), self.assertRaises(beta.FirebaseError):
                self.receive(changes=changes)
        # Reusing an exact artifact from attempt 1 is valid during a failed-job retry.
        with mock.patch.dict(os.environ, {"GITHUB_RUN_ATTEMPT": "2"}):
            self.assertEqual(json.loads(self.receive()), plan())
        with self.assertRaises(beta.FirebaseError):
            self.receive(digest="0" * 64)

    def test_handoff_does_not_extract_extra_files_traversal_or_oversized_plan(self):
        for raw in (self.archive(name="../plan.json"), self.archive(extra=True),
                    self.archive(data=b"x" * 8193), b"invalid archive"):
            with self.subTest(raw=raw[:20]), self.assertRaises(beta.FirebaseError):
                self.receive(raw=raw)
        with self.assertRaises(beta.FirebaseError):
            beta.receive_handoff(REPOSITORY, "42\n99", "a" * 64, "99", "plan")

    def test_apk_handoff_accepts_only_one_named_binary(self):
        raw = self.archive(name="unsigned.apk", data=b"public APK")
        self.assertEqual(self.receive(raw=raw, kind="unsigned"), b"public APK")
        with self.assertRaises(beta.FirebaseError):
            self.receive(raw=self.archive(name="unsigned.apk", extra=True), kind="unsigned")

    def test_build_receives_source_bound_plan_without_any_firebase_or_signing_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            event_file, output = base / "event.json", base / "output"
            event_file.write_text(json.dumps(event()), encoding="utf-8")
            environment = {"GITHUB_EVENT_PATH": str(event_file), "GITHUB_EVENT_NAME": "workflow_run",
                           "GITHUB_REPOSITORY": REPOSITORY, "GITHUB_REF": "refs/heads/main",
                           "GITHUB_RUN_ID": "99", "FIREBASE_BETA_ENABLED": "true", "GITHUB_OUTPUT": str(output)}
            with mock.patch.dict(os.environ, environment, clear=True), mock.patch.object(beta, "verify_source") as source, \
                 mock.patch.object(beta, "receive_handoff", return_value=json.dumps(plan()).encode()), \
                 mock.patch.object(beta, "validate_config") as configuration, mock.patch.object(beta, "FirebaseAPI") as api, \
                 contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(beta.main(["receive-plan", "--directory", str(base / "handoff")]), 0)
            source.assert_called_once_with(COMMIT, REPOSITORY, current_main=True)
            configuration.assert_not_called()
            api.assert_not_called()
            self.assertEqual(json.loads((base / "handoff/plan.json").read_bytes()), plan())
            self.assertIn("name=" + plan()["state"]["name"], output.read_text())
            different_source = copy.deepcopy(plan())
            different_source["state"]["commit"] = "d" * 40
            with mock.patch.dict(os.environ, environment, clear=True), mock.patch.object(beta, "verify_source"), \
                 mock.patch.object(beta, "receive_handoff", return_value=json.dumps(different_source).encode()), \
                 contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(beta.main(["receive-plan", "--directory", str(base / "wrong")]), 1)
            self.assertFalse((base / "wrong/plan.json").exists())

    def test_unsigned_staging_removes_only_signature_entries_and_signing_block(self):
        with tempfile.TemporaryDirectory() as folder:
            source, destination = Path(folder) / "input.apk", Path(folder) / "unsigned.apk"
            fixture_apk(source)
            with zipfile.ZipFile(source, "a") as archive:
                for name in ("META-INF/MANIFEST.MF", "META-INF/CERT.SF", "META-INF/CERT.RSA",
                             "META-INF/OTHER.EC", "META-INF/SIG-OLD", "META-INF/module.kotlin_module"):
                    archive.writestr(name, name)
            # ZIP readers accept data outside entries; rebuilding must discard it.
            with source.open("ab") as output:
                output.write(b"old signing block marker")
            beta.stage_unsigned_apk(source, destination)
            with zipfile.ZipFile(destination) as archive:
                self.assertEqual(set(archive.namelist()), {"AndroidManifest.xml", "classes.dex", "META-INF/module.kotlin_module"})
            self.assertNotIn(b"old signing block marker", destination.read_bytes())
            with self.assertRaises(beta.FirebaseError):
                beta.stage_unsigned_apk(source, source)

    def test_ambiguous_or_expansion_bomb_apk_is_rejected_before_decompression(self):
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "input.apk"
            fixture_apk(apk)
            with zipfile.ZipFile(apk, "a") as archive:
                with self.assertWarns(UserWarning):
                    archive.writestr("classes.dex", "ambiguous")
            with self.assertRaises(beta.FirebaseError):
                beta.validate_apk(apk)
            fixture_apk(apk)
            with mock.patch.object(beta, "MAX_APK_EXPANDED", 1), self.assertRaises(beta.FirebaseError):
                beta.validate_apk(apk)


class WorkflowBoundaryTests(unittest.TestCase):
    def test_build_and_privileged_jobs_have_separate_credentials_and_execution(self):
        workflow = Path(__file__).resolve().parents[1] / "workflows" / "android-firebase-beta.yml"
        text = workflow.read_text(encoding="utf-8")
        jobs = {}
        for name in ("plan", "build", "publish"):
            start = text.index("\n  " + name + ":\n")
            end = text.find("\n  ", start + 1)
            while end != -1 and text[end + 3:end + 4] == " ":
                end = text.find("\n  ", end + 1)
            jobs[name] = text[start:end if end != -1 else len(text)]
        build = jobs["build"]
        self.assertIn("environment: firebase-beta-build", build)
        for forbidden in ("id-token:", "secrets.HICIARZ_", "secrets.FIREBASE_", "google-github-actions/auth"):
            self.assertNotIn(forbidden, build)
        self.assertIn("cache-disabled: true", build)
        for name in ("plan", "publish"):
            for forbidden in ("./gradlew", "unittest", "setup-gradle"):
                self.assertNotIn(forbidden, jobs[name])
            self.assertIn("id-token: write", jobs[name])
        self.assertIn("--ks-pass env:HICIARZ_KEYSTORE_PASSWORD", jobs["publish"])
        self.assertIn("--key-pass env:HICIARZ_KEY_PASSWORD", jobs["publish"])


class ApiTests(unittest.TestCase):
    def response(self, body):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps(body).encode()
        return response

    def test_raw_apk_upload_uses_fixed_google_host_headers_and_no_redirects(self):
        opener = mock.Mock()
        opener.open.return_value = self.response({"name": OPERATION, "done": True,
            "response": {"result": "RELEASE_CREATED", "release": {"name": RELEASE}}})
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "app.apk"
            apk.write_bytes(b"apk")
            result = beta.FirebaseAPI("token", APP_ID, opener).upload(apk)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, beta.API_ROOT + "/upload/v1/" + APP + "/releases:upload")
        self.assertEqual(request.get_header("Authorization"), "Bearer token")
        self.assertEqual(request.get_header("X-goog-upload-protocol"), "raw")
        self.assertEqual(request.data, b"apk")
        self.assertEqual(result, {"name": RELEASE})
        self.assertIsNone(beta.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.test"))

    def test_http_and_transport_failures_do_not_echo_remote_content_or_retry(self):
        for failure in (urllib.error.HTTPError("https://private.test", 403, "token-private", {}, io.BytesIO(b"private")),
                        urllib.error.URLError("private-token"), TimeoutError("private-token")):
            opener = mock.Mock()
            opener.open.side_effect = failure
            with self.subTest(failure=type(failure)), self.assertRaises(beta.FirebaseError) as error:
                beta.FirebaseAPI("token", APP_ID, opener).request("POST", APP + "/releases:upload")
            self.assertNotIn("private", str(error.exception))
            self.assertEqual(opener.open.call_count, 1)

    def test_server_resource_cannot_redirect_upload_polling_or_other_calls(self):
        api = beta.FirebaseAPI("token", APP_ID)
        for name in ("https://evil.test", RELEASE.replace("123456789", "987654321"), RELEASE + "?token=private"):
            with self.subTest(name=name), self.assertRaises(beta.FirebaseError):
                api.validate_resource(name)
        with mock.patch.object(api, "request", return_value={"name": "https://evil.test"}) as request:
            with self.assertRaises(beta.FirebaseError):
                api.upload(Path("unused"))
            self.assertEqual(request.call_count, 1)

    def test_release_pagination_validates_codes_and_collects_all_pages(self):
        api = beta.FirebaseAPI("token", APP_ID)
        with mock.patch.object(api, "request", side_effect=[
            {"releases": [{"name": RELEASE, "buildVersion": "2"}], "nextPageToken": "second"},
            {"releases": [{"name": RELEASE + "2", "buildVersion": "10"}]}]):
            self.assertEqual([item["buildVersion"] for item in api.releases()], ["2", "10"])
        with mock.patch.object(api, "request", return_value={"releases": [{"name": RELEASE, "buildVersion": "bad"}]}):
            with self.assertRaises(beta.FirebaseError):
                api.releases()

    def test_operation_polls_read_only_and_never_retries_upload(self):
        api = beta.FirebaseAPI("token", APP_ID)
        with mock.patch.object(api, "request", side_effect=[{"name": OPERATION},
            {"name": OPERATION, "done": True, "response": {"result": "RELEASE_CREATED", "release": {"name": RELEASE}}}]) as request:
            api.upload(Path("unused"), sleep=lambda _: None)
            self.assertEqual([call.args[0] for call in request.call_args_list], ["POST", "GET"])


class PublishTests(unittest.TestCase):
    def api(self, value):
        api = mock.Mock()
        api.releases.return_value = []
        api.upload.return_value = {"name": RELEASE, "buildVersion": str(value["state"]["code"]), "displayVersion": value["state"]["name"]}
        api.validate_resource.return_value = RELEASE
        api.request.side_effect = [{"name": RELEASE, "releaseNotes": {"text": value["notes"]}}, {}]
        return api

    def test_distribution_only_after_version_and_source_checks_with_groups_not_emails(self):
        value = plan()
        api = self.api(value)
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "app.apk"
            fixture_apk(apk)
            check = mock.Mock()
            state = beta.publish(api, value, apk, ["beta"], check_source=check)
        self.assertEqual(state, value["state"])
        self.assertEqual(check.call_count, 3)
        self.assertEqual(api.request.call_args.kwargs["data"], {"groupAliases": ["beta"]})
        self.assertNotIn(APP_ID, json.dumps(state))
        self.assertEqual(set(state), beta.STATE_KEYS)

    def test_stale_source_or_consumed_version_stops_before_upload(self):
        value = plan()
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "app.apk"
            fixture_apk(apk)
            api = self.api(value)
            api.releases.return_value = [{"buildVersion": str(value["state"]["code"])}]
            with self.assertRaises(beta.FirebaseError):
                beta.publish(api, value, apk, ["beta"], check_source=lambda: None)
            api.upload.assert_not_called()
            api = self.api(value)
            with self.assertRaises(beta.FirebaseError):
                beta.publish(api, value, apk, ["beta"], check_source=mock.Mock(side_effect=beta.FirebaseError("stale")))
            api.upload.assert_not_called()

    def test_wrong_uploaded_version_or_stale_after_upload_never_distributes(self):
        value = plan()
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "app.apk"
            fixture_apk(apk)
            api = self.api(value)
            api.upload.return_value["buildVersion"] = "1"
            with self.assertRaises(beta.FirebaseError):
                beta.publish(api, value, apk, ["beta"], check_source=lambda: None)
            api.request.assert_not_called()
            api = self.api(value)
            with self.assertRaises(beta.FirebaseError):
                beta.publish(api, value, apk, ["beta"], check_source=mock.Mock(side_effect=[None, beta.FirebaseError("stale")]))
            api.request.assert_not_called()

    def test_uncertain_distribution_has_no_success_state_or_mutation_retry(self):
        value = plan()
        api = self.api(value)
        api.request.side_effect = [{"name": RELEASE, "releaseNotes": {"text": value["notes"]}}, beta.FirebaseError("uncertain")]
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / "app.apk"
            fixture_apk(apk)
            with self.assertRaises(beta.FirebaseError):
                beta.publish(api, value, apk, ["beta"], check_source=lambda: None)
        self.assertEqual(api.request.call_count, 2)


if __name__ == "__main__":
    unittest.main()
