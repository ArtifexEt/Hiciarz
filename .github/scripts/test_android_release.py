import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

import android_release as release


REPOSITORY = "ArtifexEt/Hiciarz"
COMMIT = "a" * 40
CHANGELOG = """# Android changes

## [Unreleased]
- Future feature sentinel.

## [0.1.0-alpha.3] - 2026-11-12
### Poprawione
- New release sentinel.
<!-- Maintainer-only comment. -->

## [0.1.0-alpha.2] - 2026-11-11
- Old release sentinel.
"""


def github_release(version, *, published="2026-11-11T23:00:00Z", draft=False, prefix="android-v"):
    return {"tag_name": prefix + version, "published_at": published, "draft": draft, "prerelease": True}


class ChangelogTests(unittest.TestCase):
    def setUp(self):
        self.sections = release.parse_changelog(CHANGELOG)

    def test_extracts_exact_version_and_removes_maintainer_comments(self):
        self.assertEqual(self.sections["0.1.0-alpha.3"], "### Poprawione\n- New release sentinel.")
        self.assertIn("Future feature sentinel", self.sections["Unreleased"])
        self.assertIn("Old release sentinel", self.sections["0.1.0-alpha.2"])

    def test_fenced_heading_does_not_start_another_release(self):
        sections = release.parse_changelog("## [1.0.0]\n- Example:\n```markdown\n## [9.9.9]\n```\n")
        self.assertEqual(list(sections), ["1.0.0"])
        self.assertIn("## [9.9.9]", sections["1.0.0"])

    def test_rejects_invalid_duplicate_and_empty_sections(self):
        invalid = [
            "## [1.0.0]\n- First\n## [1.0.0]\n- Duplicate\n",
            "## [Unreleased]\n- Future\n## [Unreleased]\n- Duplicate\n## [1.0.0]\n- Fix\n",
            "## 1.0.0\n- Missing brackets\n",
            "## [1.0.0] - 2026-02-30\n- Invalid date\n",
            "## [01.0.0]\n- Invalid version\n",
            "## [1.0.0]\n",
            "## [1.0.0]\n### Fixed\n<!-- write notes here -->\n- \n",
            "## [Unreleased]\n- No numbered release\n",
        ]
        for text in invalid:
            with self.subTest(text=text), self.assertRaises(release.ReleaseError):
                release.parse_changelog(text)

    def test_semver_order_matches_numeric_prereleases_and_stable_releases(self):
        versions = ["1.0.0-alpha.2", "1.0.0-alpha.10", "1.0.0-beta", "1.0.0-rc.1", "1.0.0", "1.0.1"]
        self.assertEqual(sorted(reversed(versions), key=release.version_key), versions)
        self.assertLess(release.version_key("1.0.0-1"), release.version_key("1.0.0-alpha"))
        self.assertEqual(release.version_key("1.0.0+build.1"), release.version_key("1.0.0+build.2"))

    def test_invalid_semver_is_rejected(self):
        for version in ["Unreleased", "v1.0.0", "1.0", "1.01.0", "1.0.0-alpha.01", "1.0.0-alpha..1", "1.0.0\n"]:
            with self.subTest(version=version), self.assertRaises(release.ReleaseError):
                release.version_key(version)

    def test_blank_input_selects_first_numbered_section(self):
        self.assertEqual(release.resolve_version(self.sections, "", "branch", "main"), "0.1.0-alpha.3")
        self.assertEqual(release.resolve_version(self.sections, "0.1.0-alpha.2", "branch", "main"), "0.1.0-alpha.2")

    def test_tag_is_authoritative_and_conflicting_or_missing_versions_fail(self):
        self.assertEqual(release.resolve_version(self.sections, "", "tag", "android-v0.1.0-alpha.3"), "0.1.0-alpha.3")
        invalid = [("0.1.0-alpha.2", "tag", "android-v0.1.0-alpha.3"),
                   ("", "tag", "web-v0.1.0-alpha.3"), ("9.0.0", "branch", "main")]
        for args in invalid:
            with self.subTest(args=args), self.assertRaises(release.ReleaseError):
                release.resolve_version(self.sections, *args)

    def test_notes_include_selected_changes_and_correct_comparison_only(self):
        notes = release.render_notes(self.sections["0.1.0-alpha.3"], repository=REPOSITORY,
                                     version="0.1.0-alpha.3", previous_tag="android-v0.1.0-alpha.2", commit=COMMIT)
        self.assertIn("New release sentinel", notes)
        self.assertNotIn("Future feature sentinel", notes)
        self.assertNotIn("Old release sentinel", notes)
        self.assertNotIn("Maintainer-only", notes)
        self.assertIn("/compare/android-v0.1.0-alpha.2...android-v0.1.0-alpha.3", notes)
        self.assertIn("hiciarz-android-0.1.0-alpha.3-test.apk", notes)
        self.assertIn(f"/blob/{COMMIT}/android-app/README.md", notes)

    def test_first_release_notes_do_not_link_to_a_nonexistent_previous_release(self):
        notes = release.render_notes("- First version", repository=REPOSITORY, version="1.0.0",
                                     previous_tag="", commit=COMMIT)
        self.assertIn("Pierwsze wydanie", notes)
        self.assertNotIn("/compare/", notes)


class GitHubMetadataTests(unittest.TestCase):
    def test_previous_release_includes_android_prereleases_and_uses_publication_date(self):
        items = [github_release("0.1.0-alpha.1", published="2026-11-12T01:00:00Z"),
                 github_release("0.1.0-alpha.2", published="2026-11-12T00:00:00Z"),
                 github_release("9.0.0", prefix="web-v", published="2026-11-13T00:00:00Z"),
                 github_release("8.0.0", draft=True), github_release("7.0.0", published=None)]
        selected = release.published_android_releases(items)
        self.assertEqual([item["tag_name"] for item in selected], ["android-v0.1.0-alpha.1", "android-v0.1.0-alpha.2"])

    def test_load_releases_flattens_all_pages(self):
        first, second = github_release("1.0.0"), github_release("0.9.0")
        with mock.patch.object(release, "command_output", return_value=json.dumps([[first], [second]])) as command:
            self.assertEqual(release.load_releases(REPOSITORY), [first, second])
        self.assertIn("--paginate", command.call_args.args)
        self.assertIn("--slurp", command.call_args.args)

    def test_malformed_api_responses_fail_closed(self):
        for response in ["not json", "{}", "[{}]", "[[{}]]", '[[{"tag_name": null}]]']:
            with self.subTest(response=response), mock.patch.object(release, "command_output", return_value=response):
                with self.assertRaises(release.ReleaseError):
                    release.load_releases(REPOSITORY)

    def test_api_and_missing_command_errors_are_not_treated_as_an_empty_release_list(self):
        denied = subprocess.CompletedProcess(["gh"], 1, stdout="", stderr="HTTP 403: denied")
        with mock.patch.object(release.subprocess, "run", return_value=denied):
            with self.assertRaisesRegex(release.ReleaseError, "403"):
                release.load_releases(REPOSITORY)
        with mock.patch.object(release.subprocess, "run", side_effect=FileNotFoundError("gh missing")):
            with self.assertRaisesRegex(release.ReleaseError, "Cannot run gh"):
                release.command_output("gh", "api")

    def test_build_info_requires_matching_application_version_and_valid_code(self):
        valid = "applicationId=pl.artifex.hiciarz\nversionName=0.1.0-alpha.2\nversionCode=100002\ncommit=abc\nsigning=test\n"
        with mock.patch.object(release, "command_output", return_value=valid):
            self.assertEqual(release.published_version_code(REPOSITORY, "android-v0.1.0-alpha.2"), 100002)
        invalid = [valid.replace("pl.artifex.hiciarz", "another.application"),
                   valid.replace("versionName=0.1.0-alpha.2", "versionName=0.1.0-alpha.1"),
                   valid.replace("versionCode=100002\n", ""), valid + "versionCode=100003\n",
                   valid.replace("versionCode=100002", "versionCode=2100000001")]
        for text in invalid:
            with self.subTest(text=text), mock.patch.object(release, "command_output", return_value=text):
                with self.assertRaises(release.ReleaseError):
                    release.published_version_code(REPOSITORY, "android-v0.1.0-alpha.2")


class ReleasePlanTests(unittest.TestCase):
    def setUp(self):
        self.sections = release.parse_changelog(CHANGELOG)
        self.releases = [github_release("0.1.0-alpha.1", published="2026-11-12T01:00:00Z"),
                         github_release("0.1.0-alpha.2", published="2026-11-12T00:00:00Z")]
        self.codes = {"android-v0.1.0-alpha.1": 100050, "android-v0.1.0-alpha.2": 100100}

    def prepare(self, *, releases=None, **kwargs):
        with mock.patch.object(release, "load_releases", return_value=self.releases if releases is None else releases), \
             mock.patch.object(release, "check_git_refs", return_value=COMMIT), \
             mock.patch.object(release, "published_version_code", side_effect=lambda repo, tag: self.codes[tag]):
            return release.prepare_release(self.sections, repository=REPOSITORY, **kwargs)

    def test_auto_code_uses_highest_published_code_even_when_not_latest_by_date(self):
        plan, notes = self.prepare(run_number=1)
        self.assertEqual(plan["code"], 100101)
        self.assertEqual(plan["previous_tag"], "android-v0.1.0-alpha.1")
        self.assertEqual(plan["name"], "0.1.0-alpha.3")
        self.assertIn("New release sentinel", notes)

    def test_auto_code_preserves_workflow_run_number_when_it_is_higher(self):
        plan, _ = self.prepare(run_number=200)
        self.assertEqual(plan["code"], 100200)

    def test_manual_code_must_exceed_published_maximum_and_fit_android(self):
        plan, _ = self.prepare(version_code="100102")
        self.assertEqual(plan["code"], 100102)
        for value in ["100050", "100100", "0", "-1", "abc", "2100000001"]:
            with self.subTest(value=value), self.assertRaises(release.ReleaseError):
                self.prepare(version_code=value)

    def test_existing_published_release_and_draft_fail_before_git_or_build_metadata(self):
        for draft in [False, True]:
            with self.subTest(draft=draft), \
                 mock.patch.object(release, "load_releases", return_value=[github_release("0.1.0-alpha.3", draft=draft)]), \
                 mock.patch.object(release, "check_git_refs") as git, \
                 mock.patch.object(release, "published_version_code") as metadata:
                with self.assertRaisesRegex(release.ReleaseError, "already exists"):
                    release.prepare_release(self.sections, repository=REPOSITORY)
                git.assert_not_called()
                metadata.assert_not_called()

    def test_cannot_release_an_older_version_than_any_published_android_release(self):
        with self.assertRaisesRegex(release.ReleaseError, "newer"):
            self.prepare(releases=[github_release("0.1.0-alpha.10")])

    def test_first_release_has_no_previous_tag_and_uses_initial_code(self):
        plan, notes = self.prepare(releases=[])
        self.assertEqual(plan["previous_tag"], "")
        self.assertEqual(plan["code"], 100001)
        self.assertIn("Pierwsze wydanie", notes)

    def test_invalid_repository_and_failed_api_stop_preflight(self):
        with mock.patch.object(release, "load_releases") as load:
            with self.assertRaises(release.ReleaseError):
                release.prepare_release(self.sections, repository="owner/repo\nmalicious")
            load.assert_not_called()
        with mock.patch.object(release, "load_releases", side_effect=release.ReleaseError("API unavailable")):
            with self.assertRaisesRegex(release.ReleaseError, "API unavailable"):
                release.prepare_release(self.sections, repository=REPOSITORY)


class GitAndOutputTests(unittest.TestCase):
    @staticmethod
    def git_output(*args):
        if args[:2] == ("git", "rev-parse"):
            return COMMIT if args[2] == "HEAD^{commit}" else "b" * 40
        return ""

    def test_tag_cannot_point_to_different_commit(self):
        with mock.patch.object(release, "command_output", side_effect=self.git_output), \
             mock.patch.object(release.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            with self.assertRaisesRegex(release.ReleaseError, "another commit"):
                release.check_git_refs("android-v0.1.0-alpha.3", COMMIT, "")

    def test_requested_commit_must_be_checked_out(self):
        with mock.patch.object(release, "command_output", side_effect=self.git_output):
            with self.assertRaisesRegex(release.ReleaseError, "checked-out"):
                release.check_git_refs("android-v0.1.0-alpha.3", "b" * 40, "")

    def test_missing_new_tag_is_allowed_but_previous_release_must_be_an_ancestor(self):
        for ancestry in [0, 1, 128]:
            def git_run(args, **kwargs):
                return subprocess.CompletedProcess(args, 1 if args[1] == "show-ref" else ancestry)
            with self.subTest(ancestry=ancestry), \
                 mock.patch.object(release, "command_output", side_effect=self.git_output), \
                 mock.patch.object(release.subprocess, "run", side_effect=git_run):
                if ancestry == 0:
                    self.assertEqual(release.check_git_refs("android-v0.1.0-alpha.3", COMMIT, "android-v0.1.0-alpha.2"), COMMIT)
                else:
                    with self.assertRaisesRegex(release.ReleaseError, "previous release"):
                        release.check_git_refs("android-v0.1.0-alpha.3", COMMIT, "android-v0.1.0-alpha.2")

    def test_write_plan_preserves_notes_and_appends_actions_outputs_and_summary(self):
        plan = {"tag": "android-v0.1.0-alpha.3", "name": "0.1.0-alpha.3", "code": 100101,
                "previous_tag": "android-v0.1.0-alpha.2", "commit": COMMIT}
        notes = "## Co się zmieniło\n\n- Notes sentinel.\n"
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            output = base / "github-output"
            summary = base / "github-summary"
            output.write_text("earlier=preserved\n")
            with mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(output), "GITHUB_STEP_SUMMARY": str(summary)}):
                release.write_plan(plan, notes, base / "artifacts")
            self.assertEqual((base / "artifacts/RELEASE-NOTES.md").read_text(), notes)
            self.assertEqual(json.loads((base / "artifacts/RELEASE-PLAN.json").read_text()), plan)
            self.assertIn("earlier=preserved\n", output.read_text())
            self.assertIn("code=100101\n", output.read_text())
            self.assertIn("Notes sentinel", summary.read_text())

    def test_check_changelog_cli_has_no_git_or_github_calls(self):
        with tempfile.TemporaryDirectory() as directory:
            changelog = Path(directory) / "CHANGELOG.md"
            changelog.write_text(CHANGELOG)
            with mock.patch.object(release.subprocess, "run") as command, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(release.main(["--check-changelog", "--changelog", str(changelog)]), 0)
                command.assert_not_called()

    def test_cli_writes_matching_plan_notes_summary_and_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            changelog = base / "CHANGELOG.md"
            changelog.write_text(CHANGELOG)
            output, summary = base / "output", base / "summary"
            environment = {"GITHUB_OUTPUT": str(output), "GITHUB_STEP_SUMMARY": str(summary),
                           "GITHUB_SHA": COMMIT, "GITHUB_RUN_NUMBER": "1", "GITHUB_REF_TYPE": "branch"}
            stdout = io.StringIO()
            with mock.patch.dict(os.environ, environment), \
                 mock.patch.object(release, "load_releases", return_value=[github_release("0.1.0-alpha.2")]), \
                 mock.patch.object(release, "check_git_refs", return_value=COMMIT), \
                 mock.patch.object(release, "published_version_code", return_value=100002), \
                 contextlib.redirect_stdout(stdout):
                result = release.main(["--repository", REPOSITORY, "--changelog", str(changelog),
                                       "--output-dir", str(base / "artifacts")])
            self.assertEqual(result, 0)
            plan = json.loads((base / "artifacts/RELEASE-PLAN.json").read_text())
            self.assertEqual(json.loads(stdout.getvalue()), plan)
            self.assertEqual(plan["code"], 100003)
            notes = (base / "artifacts/RELEASE-NOTES.md").read_text()
            self.assertIn("New release sentinel", notes)
            self.assertNotIn("Future feature sentinel", notes)
            self.assertNotIn("Old release sentinel", notes)
            self.assertIn(notes, summary.read_text())
            self.assertIn("versionCode: `100003`", summary.read_text())
            self.assertEqual(output.read_text(), "tag=android-v0.1.0-alpha.3\nname=0.1.0-alpha.3\n"
                             "code=100003\nprevious_tag=android-v0.1.0-alpha.2\n")

    def test_cli_api_failure_reports_error_and_does_not_write_a_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            changelog = base / "CHANGELOG.md"
            changelog.write_text(CHANGELOG)
            stderr = io.StringIO()
            with mock.patch.object(release, "load_releases", side_effect=release.ReleaseError("HTTP 503: unavailable")), \
                 contextlib.redirect_stderr(stderr):
                result = release.main(["--repository", REPOSITORY, "--changelog", str(changelog),
                                       "--output-dir", str(base / "artifacts")])
            self.assertEqual(result, 1)
            self.assertIn("Release preflight failed: HTTP 503", stderr.getvalue())
            self.assertFalse((base / "artifacts").exists())


if __name__ == "__main__":
    unittest.main()
