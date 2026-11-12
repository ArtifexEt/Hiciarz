#!/usr/bin/env python3
"""Prepare and publish Hiciarz betas exclusively to Google Play internal testing.

The caller supplies a short-lived PLAY_ACCESS_TOKEN. Mutating API calls are never
retried: after an uncertain commit, inspect Play Console before starting a new run.
"""

import argparse
import base64
import binascii
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

import android_release as release


PACKAGE = "pl.artifex.hiciarz"
TRACK = "internal"
API_ROOT = "https://androidpublisher.googleapis.com"
MAX_VERSION_CODE = release.MAX_VERSION_CODE
MAPPING_ENTRY = "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map"
FINGERPRINT_PATHS = (
    "android-app/app/src/main", "android-app/app/build.gradle.kts", "android-app/app/proguard-rules.pro",
    "android-app/build.gradle.kts", "android-app/settings.gradle.kts", "android-app/gradle.properties",
    "android-app/gradle", "android-app/gradlew", "android-app/gradlew.bat", "web/public/themes",
    ".github/workflows/android-beta.yml", ".github/scripts/android_beta.py", ".github/scripts/android_release.py",
)


class BetaError(ValueError):
    pass


class PlayError(BetaError):
    pass


def execution_context(event_name, event, repository, ref, enabled, dry_run=False):
    """Accept only checked main pushes, or an explicit main-branch dispatch."""
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise BetaError("A valid GitHub repository is required.")
    if event_name == "workflow_run":
        upstream = event.get("workflow_run", {})
        trusted = (upstream.get("name") == "Check web and Android"
                   and upstream.get("conclusion") == "success"
                   and upstream.get("event") == "push"
                   and upstream.get("head_branch") == "main"
                   and (upstream.get("head_repository") or {}).get("full_name") == repository)
        if not trusted:
            raise BetaError("Skipped: the upstream run is not a successful main push in this repository.")
        commit = upstream.get("head_sha", "")
    elif event_name == "workflow_dispatch" and ref == "refs/heads/main":
        commit = event.get("after") or os.environ.get("GITHUB_SHA", "")
    else:
        raise BetaError("Skipped: betas require a trusted main push or a main-branch manual run.")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", commit):
        raise BetaError("The source must be a full Git commit SHA.")
    if enabled != "true" and not (dry_run and event_name == "workflow_dispatch"):
        raise BetaError("Skipped: PLAY_BETA_ENABLED is not true; nothing was uploaded.")
    return commit


def version_code(value, label="versionCode"):
    try:
        return release.positive_code(value, label)
    except release.ReleaseError as error:
        raise BetaError(str(error)) from error


def next_version_code(run_number, *, play_max=0, github_max=0, floor=0):
    if type(run_number) is not int or run_number < 1:
        raise BetaError("The workflow run number must be a positive integer.")
    for label, value in (("Play maximum", play_max), ("GitHub maximum", github_max), ("code floor", floor)):
        if type(value) is not int or value < 0 or value > MAX_VERSION_CODE:
            raise BetaError(f"Invalid {label}.")
    return version_code(max(100_000 + run_number, play_max + 1, github_max + 1, floor))


def highest_play_code(bundles, tracks, apks):
    codes = []
    for response, key in ((bundles, "bundles"), (apks, "apks")):
        items = response.get(key, []) if isinstance(response, dict) else None
        if not isinstance(items, list):
            raise BetaError(f"Invalid Play {key} response.")
        for item in items:
            if not isinstance(item, dict):
                raise BetaError(f"Invalid Play {key} entry.")
            codes.append(version_code(item.get("versionCode"), f"Play {key} versionCode"))
    items = tracks.get("tracks", []) if isinstance(tracks, dict) else None
    if not isinstance(items, list):
        raise BetaError("Invalid Play tracks response.")
    for track in items:
        if not isinstance(track, dict) or not isinstance(track.get("releases", []), list):
            raise BetaError("Invalid Play track entry.")
        for item in track.get("releases", []):
            if not isinstance(item, dict) or not isinstance(item.get("versionCodes", []), list):
                raise BetaError("Invalid Play release entry.")
            codes.extend(version_code(code, "Play track versionCode") for code in item.get("versionCodes", []))
    return max(codes, default=0)


def github_max_code(repository):
    published = release.published_android_releases(release.load_releases(repository))
    return max((release.published_version_code(repository, item["tag_name"]) for item in published), default=0)


def source_fingerprint(spotify_client_id, upload_certificate):
    # ls-tree covers the full committed trees, including deletions and multi-commit
    # pushes; generated files, tests, documentation, and the web UI are excluded.
    raw_tree = release.command_output("git", "ls-tree", "-r", "-z", "--full-tree", "HEAD", "--", *FINGERPRINT_PATHS)
    records = []
    for record in raw_tree.split("\0"):
        if not record:
            continue
        fields = record.split("\t", 1)
        if len(fields) != 2:
            raise BetaError("Invalid production source tree response.")
        path = fields[1]
        if path.startswith("web/public/themes/"):
            name = path.removeprefix("web/public/themes/")
            if "/" in name or not (name.endswith(".svg") or name in ("fish-santa.webp", "fish-santa-ornament.webp")):
                continue
        records.append(record)
    if not records:
        raise BetaError("Cannot fingerprint the Android production sources.")
    tree = "\0".join(records) + "\0"
    certificate = re.sub(r"[\s:]", "", upload_certificate).lower()
    payload = (tree + "\0SPOTIFY_CLIENT_ID=" + spotify_client_id
               + "\0PLAY_UPLOAD_CERT_SHA256=" + certificate).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def fingerprint_release_name(fingerprint):
    """Keep machine state in the developer-only release name (48 characters)."""
    if not isinstance(fingerprint, str) or not re.fullmatch(r"[a-f0-9]{64}", fingerprint):
        raise BetaError("Invalid Android source fingerprint.")
    return "beta-" + base64.urlsafe_b64encode(bytes.fromhex(fingerprint)).decode("ascii").rstrip("=")


def release_name_fingerprint(name):
    if not isinstance(name, str) or not re.fullmatch(r"beta-[A-Za-z0-9_-]{43}", name):
        return None
    try:
        decoded = base64.b64decode(name[5:] + "=", altchars=b"-_", validate=True)
    except (binascii.Error, ValueError):
        return None
    if len(decoded) != 32 or fingerprint_release_name(decoded.hex()) != name:
        return None
    return decoded.hex()


def current_internal_fingerprint(tracks):
    internal = [track for track in tracks.get("tracks", []) if track.get("track") == TRACK]
    if len(internal) != 1:
        raise BetaError("Create the internal testing track and first release in Play Console before enabling automation.")
    completed = [item for item in internal[0].get("releases", []) if item.get("status") == "completed"
                 and item.get("versionCodes")]
    if not completed:
        return None
    latest = max(completed, key=lambda item: max(version_code(value) for value in item["versionCodes"]))
    return release_name_fingerprint(latest.get("name"))


def verify_successful_checks(commit, repository):
    response = release.command_output(
        "gh", "api", "--paginate", "--slurp",
        f"repos/{repository}/actions/workflows/ci.yml/runs?head_sha={commit}&event=push&status=completed&per_page=100")
    try:
        pages = json.loads(response)
        runs = [run for page in pages for run in page["workflow_runs"]]
        passed = any(run.get("name") == "Check web and Android" and run.get("head_sha") == commit
                     and run.get("head_branch") == "main" and run.get("event") == "push"
                     and run.get("conclusion") == "success"
                     and (run.get("head_repository") or {}).get("full_name") == repository for run in runs)
    except (ValueError, TypeError, KeyError, AttributeError):
        raise BetaError("Cannot verify the completed CI runs for this commit.") from None
    if not passed:
        raise BetaError("This commit has no successful Check web and Android main-push run; wait for CI before publishing.")


def verify_source(commit, repository, *, current_main=False):
    if release.command_output("git", "rev-parse", "HEAD^{commit}").strip() != commit:
        raise BetaError("The checked-out source does not match the triggering commit.")
    if current_main:
        head = release.command_output("gh", "api", f"repos/{repository}/git/ref/heads/main", "--jq", ".object.sha").strip()
        if head != commit:
            raise BetaError("Main has advanced; skip this stale beta and wait for checks of the current commit.")


def make_plan(sections, *, repository, commit, run_number, fingerprint, github_max=0, play_max=None,
              previous_fingerprint=None, floor=0):
    numbered = next((name for name in sections if name != "Unreleased"), None)
    if not numbered:
        raise BetaError("The Android changelog needs a versioned section.")
    release.version_key(numbered)
    base = numbered.split("-", 1)[0].split("+", 1)[0]
    code = next_version_code(run_number, play_max=play_max or 0, github_max=github_max, floor=floor)
    name = f"{base}-beta.{run_number}"
    if len(name) > 50:
        raise BetaError("The beta release name exceeds the Play limit of 50 characters.")
    body = sections.get("Unreleased", "")
    if not release.has_changes(body):
        body = sections[numbered]
    # Play limits each localized release note to 500 characters.
    plain_notes = "\n".join(line.lstrip("#*- ").strip() for line in body.splitlines() if line.strip())
    if not re.fullmatch(r"[a-f0-9]{64}", fingerprint):
        raise BetaError("Invalid Android source fingerprint.")
    note = ("Wersja testowa.\n" + plain_notes)[:500]
    return {
        "package": PACKAGE, "track": TRACK, "name": name, "code": code,
        "commit": commit, "repository": repository, "runNumber": run_number,
        "changelogVersion": numbered, "githubMaxVersionCode": github_max,
        "playMaxVersionCode": play_max, "versionCodeFloor": floor,
        "provisional": play_max is None,
        "sourceFingerprint": fingerprint, "skip": fingerprint == previous_fingerprint,
        "releaseNotes": [{"language": "pl-PL", "text": note}],
        "notes": body,
    }


def validate_plan(plan, *, publish=False):
    if not isinstance(plan, dict) or plan.get("package") != PACKAGE or plan.get("track") != TRACK:
        raise BetaError("Only pl.artifex.hiciarz on the internal track is allowed.")
    code = version_code(plan.get("code"))
    if not isinstance(plan.get("name"), str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+-beta\.[1-9][0-9]*", plan["name"]):
        raise BetaError("Invalid beta version name.")
    if len(plan["name"]) > 50 or not re.fullmatch(r"[0-9a-fA-F]{40}", plan.get("commit", "")):
        raise BetaError("Invalid beta source or release name.")
    notes = plan.get("releaseNotes")
    if (not isinstance(notes, list) or len(notes) != 1 or not isinstance(notes[0], dict)
            or notes[0].get("language") != "pl-PL" or not isinstance(notes[0].get("text"), str)
            or not 1 <= len(notes[0]["text"]) <= 500):
        raise BetaError("Invalid localized beta release notes.")
    if publish and plan.get("provisional") is not False:
        raise BetaError("An offline preview cannot be published; prepare a live Play plan first.")
    if not re.fullmatch(r"[a-f0-9]{64}", plan.get("sourceFingerprint", "")):
        raise BetaError("Invalid Android source fingerprint in the beta plan.")
    return code


def internal_payload(plan):
    code = validate_plan(plan, publish=True)
    return {"track": TRACK, "releases": [{
        "name": fingerprint_release_name(plan["sourceFingerprint"]),
        "versionCodes": [str(code)], "status": "completed",
        "releaseNotes": plan["releaseNotes"],
    }]}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PlayAPI:
    def __init__(self, token, opener=None):
        if not token or any(character.isspace() for character in token):
            raise BetaError("A short-lived PLAY_ACCESS_TOKEN is required.")
        self.token = token
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def request(self, method, resource="", *, data=None, media=None, query=None):
        prefix = "/upload" if media is not None else ""
        url = f"{API_ROOT}{prefix}/androidpublisher/v3/applications/{PACKAGE}/edits{resource}"
        if query:
            url += "?" + urllib.parse.urlencode(query)
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/json"}
        if media is not None:
            body = Path(media).read_bytes()
            headers["Content-Type"] = "application/octet-stream"
        else:
            body = json.dumps(data).encode("utf-8") if data is not None else None
            if body is not None:
                headers["Content-Type"] = "application/json; charset=utf-8"
        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=180 if media is not None else 60) as response:
                raw = response.read()
        except urllib.error.HTTPError as error:
            # Never echo server responses, headers, URLs, tokens, or credential JSON.
            status = error.code
            error.close()
            raise PlayError(f"Google Play {method} request failed (HTTP {status}). "
                            "Check Console setup, app access, and any pending review; no retry was made.") from None
        except (urllib.error.URLError, TimeoutError, socket.timeout, OSError, http.client.HTTPException):
            raise PlayError(f"Google Play {method} request did not return a confirmed result; no retry was made.") from None
        if not raw and method == "DELETE":
            return {}
        try:
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError("Expected object")
            return result
        except (ValueError, TypeError):
            raise PlayError(f"Google Play {method} returned an invalid response; no retry was made.") from None

    def insert(self):
        result = self.request("POST", data={})
        edit_id = result.get("id", "")
        if not isinstance(edit_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", edit_id):
            raise PlayError("Google Play did not return a valid edit ID; no retry was made.")
        return edit_id

    def snapshot(self, edit_id):
        root = "/" + edit_id
        bundles = self.request("GET", root + "/bundles")
        tracks = self.request("GET", root + "/tracks")
        apks = self.request("GET", root + "/apks")
        return {"maximum": highest_play_code(bundles, tracks, apks),
                "fingerprint": current_internal_fingerprint(tracks)}

    def delete(self, edit_id):
        self.request("DELETE", "/" + edit_id)


def discard_edit(api, edit_id):
    try:
        api.delete(edit_id)
    except BetaError:
        print(f"Could not discard uncommitted edit {edit_id}; inspect Play Console. No retry was made.", file=sys.stderr)
        return False
    return True


def play_snapshot(api):
    edit_id = api.insert()
    try:
        snapshot = api.snapshot(edit_id)
    finally:
        discarded = discard_edit(api, edit_id)
    if not discarded:
        raise BetaError("The version-check edit could not be discarded; inspect Play Console before continuing.")
    return snapshot


def validate_bundle(bundle, mapping):
    if not bundle.is_file() or not mapping.is_file() or mapping.stat().st_size == 0:
        raise BetaError("The signed AAB and nonempty R8 mapping are required.")
    try:
        with zipfile.ZipFile(bundle) as archive:
            for entry in ("BundleConfig.pb", "base/manifest/AndroidManifest.xml", MAPPING_ENTRY):
                if entry not in archive.namelist():
                    raise BetaError("The AAB is missing its manifest, bundle config, or embedded R8 mapping.")
            if archive.testzip() is not None or archive.read(MAPPING_ENTRY) != mapping.read_bytes():
                raise BetaError("The AAB is corrupt or its embedded R8 mapping does not match this build.")
    except (zipfile.BadZipFile, KeyError):
        raise BetaError("The bundle is not a valid Android App Bundle ZIP.") from None
    return hashlib.sha256(bundle.read_bytes()).hexdigest()


def publish(api, plan, bundle, mapping, *, check_source):
    code = validate_plan(plan, publish=True)
    digest = validate_bundle(bundle, mapping)
    check_source()
    edit_id = api.insert()
    commit_attempted = False
    discard_attempted = False
    try:
        snapshot = api.snapshot(edit_id)
        highest = snapshot["maximum"]
        if snapshot["fingerprint"] == plan["sourceFingerprint"]:
            discard_attempted = True
            if not discard_edit(api, edit_id):
                raise BetaError("The unchanged beta edit could not be discarded.")
            return {"package": PACKAGE, "track": TRACK, "status": "skipped", "reason": "Android inputs unchanged"}
        if code <= highest:
            raise BetaError(f"Beta versionCode {code} is no longer above Play maximum {highest}; prepare a new plan.")
        uploaded = api.request("POST", f"/{edit_id}/bundles", media=bundle, query={"uploadType": "media"})
        if version_code(uploaded.get("versionCode"), "uploaded versionCode") != code:
            raise BetaError("The uploaded bundle versionCode does not match the beta plan.")
        if not isinstance(uploaded.get("sha256"), str) or uploaded["sha256"].lower() != digest:
            raise BetaError("The uploaded bundle SHA-256 does not match the verified local AAB.")
        payload = internal_payload(plan)
        track = api.request("PUT", f"/{edit_id}/tracks/{TRACK}", data=payload)
        releases = track.get("releases")
        if (track.get("track") != TRACK or not isinstance(releases, list) or len(releases) != 1
                or not isinstance(releases[0], dict) or releases[0].get("status") != "completed"
                or releases[0].get("name") != payload["releases"][0]["name"]
                or releases[0].get("versionCodes") != [str(code)]):
            raise BetaError("Google Play did not confirm the expected completed internal release.")
        check_source()  # Do not commit a build made stale while it was building/uploading.
        commit_attempted = True
        committed = api.request("POST", f"/{edit_id}:commit",
                                query={"changesInReviewBehavior": "ERROR_IF_IN_REVIEW"})
        if committed.get("id") != edit_id:
            raise PlayError("Google Play did not confirm the committed edit ID.")
        return {"package": PACKAGE, "track": TRACK, "status": "committed", "editId": edit_id,
                "versionCode": code, "versionName": plan["name"], "commit": plan["commit"], "sha256": digest}
    except (BetaError, OSError) as error:
        if commit_attempted:
            raise BetaError(f"{error} Commit was attempted for edit {edit_id}. "
                            "Inspect Play Console before another run; the edit was retained and no retry was made.") from None
        if not discard_attempted:
            discard_edit(api, edit_id)
        raise


def write_plan(plan, directory):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "RELEASE-PLAN.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    notes = (f"# Android {plan['name']} · internal\n\n{plan['notes']}\n\n"
             f"Źródła: https://github.com/{plan['repository']}/commit/{plan['commit']}\n")
    (directory / "RELEASE-NOTES.md").write_text(notes, encoding="utf-8")
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
            for key in ("name", "code", "commit"):
                output.write(f"{key}={plan[key]}\n")
            output.write(f"publish={'false' if plan['skip'] else 'true'}\n")
    summary = (f"### Android beta {plan['name']}\n\nCommit: `{plan['commit']}` · versionCode: `{plan['code']}` · track: `internal`.\n\n")
    summary += ("Dry run: no signing, build, Play authentication, or upload. Version code is provisional until Play is queried.\n"
                if plan["provisional"] else "Live plan prepared; nothing has been uploaded yet.\n")
    if plan["skip"]:
        summary += "Android production inputs match the latest completed internal release: skipped build and upload.\n"
    append_summary(summary)


def append_summary(text):
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as summary:
            summary.write(text + "\n")


def workflow_commit(dry_run):
    event_path = os.environ.get("GITHUB_EVENT_PATH", "")
    if not event_path:
        raise BetaError("Run this helper from the beta workflow; GITHUB_EVENT_PATH is missing.")
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    return execution_context(os.environ.get("GITHUB_EVENT_NAME", ""), event,
                             os.environ.get("GITHUB_REPOSITORY", ""), os.environ.get("GITHUB_REF", ""),
                             os.environ.get("PLAY_BETA_ENABLED", ""), dry_run)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preview", "prepare", "publish"))
    parser.add_argument("--changelog", type=Path, default=Path("android-app/CHANGELOG.md"))
    parser.add_argument("--output-dir", type=Path, default=Path("android-app/beta-artifacts"))
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--mapping", type=Path)
    args = parser.parse_args(argv)
    try:
        commit = workflow_commit(args.mode == "preview")
        repository = os.environ.get("GITHUB_REPOSITORY", "")
        verify_source(commit, repository, current_main=args.mode != "preview")
        if args.mode != "preview" and os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
            verify_successful_checks(commit, repository)
        fingerprint = source_fingerprint(os.environ.get("SPOTIFY_CLIENT_ID", ""),
                                         os.environ.get("PLAY_UPLOAD_CERT_SHA256", ""))
        if args.mode == "publish":
            plan = json.loads((args.output_dir / "RELEASE-PLAN.json").read_text(encoding="utf-8"))
            validate_plan(plan, publish=True)
            if plan["commit"] != commit or plan.get("repository") != repository:
                raise BetaError("The plan package/source/repository does not match this workflow.")
            if plan["sourceFingerprint"] != fingerprint:
                raise BetaError("Production inputs changed after the beta plan was prepared.")
            if plan["code"] <= github_max_code(repository):
                raise BetaError("GitHub has published this versionCode or a higher one; prepare a new beta plan.")
            if args.bundle is None or args.mapping is None:
                raise BetaError("Publishing requires --bundle and --mapping.")
            receipt = publish(PlayAPI(os.environ.get("PLAY_ACCESS_TOKEN", "")), plan, args.bundle, args.mapping,
                              check_source=lambda: verify_source(commit, repository, current_main=True))
            (args.output_dir / "PLAY-RECEIPT.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
            if receipt["status"] == "skipped":
                append_summary("Android inputs already match the latest completed internal release; no upload was attempted.")
                print("Skipped: Android production inputs are already released to internal testing.")
            else:
                append_summary(f"Committed `{plan['name']}` (`{plan['code']}`) to **internal testing** only. "
                               "Play processing or review may delay tester availability. Production was not changed.")
                print(f"Google Play confirmed internal edit {receipt['editId']} for versionCode {plan['code']}.")
        else:
            sections = release.parse_changelog(args.changelog.read_text(encoding="utf-8"))
            floor_input = os.environ.get("PLAY_VERSION_CODE_FLOOR", "").strip()
            floor = version_code(floor_input, "PLAY_VERSION_CODE_FLOOR") if floor_input else 0
            snapshot = play_snapshot(PlayAPI(os.environ.get("PLAY_ACCESS_TOKEN", ""))) if args.mode == "prepare" else None
            plan = make_plan(sections, repository=repository, commit=commit,
                             run_number=int(os.environ.get("GITHUB_RUN_NUMBER", "1")),
                             fingerprint=fingerprint, github_max=github_max_code(repository),
                             play_max=snapshot["maximum"] if snapshot else None,
                             previous_fingerprint=snapshot["fingerprint"] if snapshot else None, floor=floor)
            write_plan(plan, args.output_dir)
            print(f"Prepared {'provisional' if plan['provisional'] else 'live'} internal beta plan: {plan['name']} ({plan['code']}).")
        return 0
    except (BetaError, release.ReleaseError, OSError, ValueError) as error:
        print(f"Android beta failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
