#!/usr/bin/env python3
"""Publish signed APK betas to Firebase with short-lived, externally supplied access.

No credential files or Firebase responses are persisted. Short-lived handoffs hold
only the public plan and unsigned binary; retained publisher state is public
version/source metadata from a verified successful publisher.
"""

import argparse
import base64
import binascii
import hashlib
import http.client
import io
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

import android_release as release


PACKAGE = "pl.artifex.hiciarz"
WORKFLOW = ".github/workflows/android-firebase-beta.yml"
STATE_ARTIFACT = "android-firebase-beta-state"
API_ROOT = "https://firebaseappdistribution.googleapis.com"
MAX_JSON = 2 * 1024 * 1024
MAX_STATE_ZIP = 32 * 1024
MAX_CERTIFICATE_OUTPUT = 64 * 1024
MAX_APK = 512 * 1024 * 1024
MAX_APK_EXPANDED = 1024 * 1024 * 1024
MAX_BUILD_ZIP = MAX_APK + 1024 * 1024
STATE_KEYS = {"schema", "package", "name", "code", "commit", "fingerprint"}
FINGERPRINT_PATHS = (
    "android-app/app/src/main", "android-app/app/build.gradle.kts", "android-app/app/proguard-rules.pro",
    "android-app/build.gradle.kts", "android-app/settings.gradle.kts", "android-app/gradle.properties",
    "android-app/gradle", "android-app/gradlew", "android-app/gradlew.bat", "web/public/themes",
    WORKFLOW, ".github/scripts/android_firebase_beta.py", ".github/scripts/android_release.py",
)


class FirebaseError(ValueError):
    pass


def verify_signing_certificate(raw, expected):
    """Accept one unique signer certificate across old and current SDK formats."""
    if not isinstance(raw, bytes) or len(raw) > MAX_CERTIFICATE_OUTPUT:
        raise FirebaseError("APK certificate verification output exceeds the safety limit.")
    normalized = re.sub(r"[\s:]", "", expected).lower() if isinstance(expected, str) else ""
    if not re.fullmatch(r"[a-f0-9]{64}", normalized):
        raise FirebaseError("Configure a valid ANDROID_SIGNING_CERT_SHA256 before verification.")
    try:
        text = raw.decode("utf-8")
    except UnicodeError:
        raise FirebaseError("APK certificate verification returned invalid text.") from None
    hashes = set()
    for line in text.splitlines():
        line = line.strip()
        # Other fields (DN, SHA-1, public-key digests) do not identify the
        # signing certificate. Reject malformed signer SHA-256 lines even if
        # another scheme also reports a valid expected digest.
        if not re.search(r"\bSigner\b.*\bcertificate\s+SHA-256\s+digest\b", line):
            continue
        match = re.fullmatch(
            r"(?:Signer #[1-9][0-9]* certificate|"
            r"V[1-9][0-9]*(?:\.[0-9]+)? Signer(?: #[1-9][0-9]*)?: certificate)"
            r" SHA-256 digest: ([a-fA-F0-9]{64})", line)
        if not match:
            raise FirebaseError("APK certificate verification returned a malformed signer digest.")
        hashes.add(match[1].lower())
    if hashes != {normalized}:
        raise FirebaseError("The APK must have exactly one unique signing certificate matching the configured key.")


def repository_name(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", value):
        raise FirebaseError("A valid GitHub repository is required.")
    return value


def execution_context(event_name, event, repository, ref, enabled, *, preview=False, sha=""):
    repository_name(repository)
    if ref != "refs/heads/main":
        raise FirebaseError("Firebase beta requires the main branch.")
    if event_name == "workflow_run":
        run = event.get("workflow_run", {})
        if not (run.get("name") == "Check web and Android" and run.get("conclusion") == "success"
                and run.get("event") == "push" and run.get("head_branch") == "main"
                and (run.get("head_repository") or {}).get("full_name") == repository):
            raise FirebaseError("Firebase beta requires a successful same-repository main-push CI run.")
        sha = run.get("head_sha", "")
    elif event_name != "workflow_dispatch":
        raise FirebaseError("Only a checked main push or a manual main-branch run may publish.")
    if not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise FirebaseError("A full source commit SHA is required.")
    if enabled != "true" and not (preview and event_name == "workflow_dispatch"):
        raise FirebaseError("FIREBASE_BETA_ENABLED is not true; no Firebase access is allowed.")
    return sha


def gh_bytes(repository, endpoint, *, limit=MAX_JSON):
    repository_name(repository)
    try:
        result = subprocess.run(["gh", "api", f"repos/{repository}/{endpoint}"],
                                capture_output=True, check=False, timeout=180)
    except (OSError, subprocess.TimeoutExpired):
        raise FirebaseError("GitHub metadata could not be retrieved.") from None
    if result.returncode or len(result.stdout) > limit:
        # Do not include arguments, stderr, response content or redirect URLs.
        raise FirebaseError("GitHub metadata could not be verified.")
    return result.stdout


def gh_json(repository, endpoint):
    try:
        response = json.loads(gh_bytes(repository, endpoint))
        if not isinstance(response, dict):
            raise ValueError()
        return response
    except (ValueError, TypeError):
        raise FirebaseError("GitHub returned invalid metadata.") from None


def verify_source(commit, repository, *, current_main=True):
    if release.command_output("git", "rev-parse", "HEAD^{commit}").strip() != commit:
        raise FirebaseError("The checkout does not match the checked source commit.")
    if current_main and gh_json(repository, "git/ref/heads/main").get("object", {}).get("sha") != commit:
        raise FirebaseError("Main has advanced; wait for CI of the current source before publishing.")


def verify_successful_checks(commit, repository):
    response = gh_json(repository, f"actions/workflows/ci.yml/runs?head_sha={commit}&event=push&status=completed&per_page=100")
    runs = response.get("workflow_runs", [])
    if not isinstance(runs, list) or not any(
        isinstance(run, dict) and run.get("name") == "Check web and Android"
        and run.get("head_sha") == commit and run.get("head_branch") == "main"
        and run.get("event") == "push" and run.get("conclusion") == "success"
        and (run.get("head_repository") or {}).get("full_name") == repository for run in runs
    ):
        raise FirebaseError("The exact main source has no successful full CI run.")


def firebase_client_resources(encoded):
    """Extract only public Android client fields; never echo downloaded JSON."""
    def unique_fields(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError()
            result[key] = value
        return result

    try:
        if not isinstance(encoded, str) or not encoded or len(encoded) > 90_000:
            raise ValueError()
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 65_536:
            raise ValueError()
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_fields)
        if value.get("type") == "service_account" or "private_key" in value:
            raise ValueError()
        project = value["project_info"]
        number, project_id = project["project_number"], project["project_id"]
        if not isinstance(number, str) or not re.fullmatch(r"[1-9][0-9]*", number):
            raise ValueError()
        if not isinstance(project_id, str) or not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project_id):
            raise ValueError()
        clients = [client for client in value["client"]
                   if client.get("client_info", {}).get("android_client_info", {}).get("package_name") == PACKAGE]
        if len(clients) != 1:
            raise ValueError()
        client = clients[0]
        app_id = client["client_info"]["mobilesdk_app_id"]
        if not isinstance(app_id, str) or not re.fullmatch(r"1:" + number + r":android:[a-fA-F0-9]+", app_id):
            raise ValueError()
        keys = client["api_key"]
        if len(keys) != 1 or not isinstance(keys[0]["current_key"], str):
            raise ValueError()
        api_key = keys[0]["current_key"]
        if not re.fullmatch(r"AIza[A-Za-z0-9_-]{35}", api_key):
            raise ValueError()
        return {"google_app_id": app_id, "google_api_key": api_key,
                "project_id": project_id, "gcm_defaultSenderId": number}
    except (AttributeError, KeyError, TypeError, ValueError, binascii.Error, RecursionError):
        raise FirebaseError("Configure valid Firebase Android client configuration; values withheld.") from None


def source_fingerprint(client_id, certificate, app_id, firebase_config=""):
    tree = release.command_output("git", "ls-tree", "-r", "-z", "--full-tree", "HEAD", "--", *FINGERPRINT_PATHS)
    records = []
    for record in tree.split("\0"):
        if not record:
            continue
        fields = record.split("\t", 1)
        if len(fields) != 2:
            raise FirebaseError("Cannot fingerprint the Android production tree.")
        path = fields[1]
        if path.startswith("web/public/themes/"):
            name = path.removeprefix("web/public/themes/")
            if name.startswith("._") or "/" in name or not (name.endswith(".svg") or name in ("fish-santa.webp", "fish-santa-ornament.webp")):
                continue
        records.append(record)
    if not records:
        raise FirebaseError("The Android production source tree is empty.")
    normalized_certificate = re.sub(r"[\s:]", "", certificate).lower()
    # Only a combined one-way source fingerprint is retained publicly. No raw
    # client JSON or standalone configuration digest enters the handoff/state.
    client_digest = hashlib.sha256(json.dumps(firebase_client_resources(firebase_config),
        sort_keys=True, separators=(",", ":")).encode()).hexdigest() if firebase_config else "firebase-client-disabled"
    payload = "\0".join(records + [client_id, normalized_certificate, app_id, client_digest])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def app_resource(app_id):
    match = re.fullmatch(r"1:([1-9][0-9]*):android:[a-fA-F0-9]+", app_id)
    if not match:
        raise FirebaseError("Configure FIREBASE_APP_ID for an Android app.")
    return f"projects/{match[1]}/apps/{app_id}"


def tester_groups(value):
    groups = value.split(",") if value else []
    if not 1 <= len(groups) <= 999 or len(set(groups)) != len(groups) or any(
        not re.fullmatch(r"[a-z][a-z0-9-]{0,62}", group) for group in groups
    ):
        raise FirebaseError("Configure distinct existing FIREBASE_TESTER_GROUPS aliases separated by commas.")
    return groups


def validate_config(environment):
    app_resource(environment.get("FIREBASE_APP_ID", ""))
    if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", environment.get("FIREBASE_PROJECT_ID", "")):
        raise FirebaseError("Configure FIREBASE_PROJECT_ID in the publishing environment.")
    if not re.fullmatch(r"projects/[1-9][0-9]*/locations/global/workloadIdentityPools/[a-z0-9-]+/providers/[a-z0-9-]+",
                        environment.get("FIREBASE_WORKLOAD_IDENTITY_PROVIDER", "")):
        raise FirebaseError("Configure FIREBASE_WORKLOAD_IDENTITY_PROVIDER in the publishing environment.")
    if not re.fullmatch(r"[a-z][a-z0-9-]*@[a-z][a-z0-9-]*\.iam\.gserviceaccount\.com",
                        environment.get("FIREBASE_SERVICE_ACCOUNT", "")):
        raise FirebaseError("Configure the dedicated FIREBASE_SERVICE_ACCOUNT.")
    if not re.fullmatch(r"[a-fA-F0-9]{32}", environment.get("SPOTIFY_CLIENT_ID", "")):
        raise FirebaseError("Configure your own SPOTIFY_CLIENT_ID in the publishing environment.")
    certificate = re.sub(r"[\s:]", "", environment.get("ANDROID_SIGNING_CERT_SHA256", ""))
    if not re.fullmatch(r"[a-fA-F0-9]{64}", certificate):
        raise FirebaseError("Configure ANDROID_SIGNING_CERT_SHA256 for the private test signing key.")
    tester_groups(environment.get("FIREBASE_TESTER_GROUPS", ""))
    client = firebase_client_resources(environment.get("FIREBASE_ANDROID_CONFIG_BASE64", ""))
    if client["google_app_id"] != environment.get("FIREBASE_APP_ID") or client["project_id"] != environment.get("FIREBASE_PROJECT_ID"):
        raise FirebaseError("The Analytics client must belong to the configured Firebase publishing app.")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class FirebaseAPI:
    def __init__(self, token, app_id, opener=None):
        if not token or any(character.isspace() for character in token):
            raise FirebaseError("A short-lived FIREBASE_ACCESS_TOKEN is required.")
        self.app = app_resource(app_id)
        self.token = token
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def validate_resource(self, resource, *, operation=False):
        suffix = r"/releases/[A-Za-z0-9_-]+" + (r"/operations/[A-Za-z0-9_-]+" if operation else "")
        if not isinstance(resource, str) or not re.fullmatch(re.escape(self.app) + suffix, resource):
            raise FirebaseError("Firebase returned a resource outside the configured Android app.")
        return resource

    def request(self, method, resource, *, data=None, media=None, query=None):
        # Resource paths are assembled locally, or validated against the exact app.
        if not resource.startswith(self.app + "/") or ".." in resource or any(c in resource for c in "?#\r\n"):
            raise FirebaseError("Invalid Firebase resource path.")
        prefix = "/upload/v1/" if media is not None else "/v1/"
        url = API_ROOT + prefix + urllib.parse.quote(resource, safe="/:")
        if query:
            url += "?" + urllib.parse.urlencode(query)
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/json"}
        if media is not None:
            body = Path(media).read_bytes()
            headers.update({"Content-Type": "application/octet-stream", "X-Goog-Upload-Protocol": "raw",
                            "X-Goog-Upload-File-Name": "hiciarz-beta.apk"})
        else:
            body = json.dumps(data).encode("utf-8") if data is not None else None
            if body is not None:
                headers["Content-Type"] = "application/json; charset=utf-8"
        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=180 if media is not None else 60) as response:
                raw = response.read(MAX_JSON + 1)
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            raise FirebaseError(f"Firebase {method} failed (HTTP {status}); inspect Console before retrying. No retry was made.") from None
        except (urllib.error.URLError, TimeoutError, socket.timeout, OSError, http.client.HTTPException):
            raise FirebaseError(f"Firebase {method} did not return a confirmed result; no retry was made.") from None
        try:
            result = json.loads(raw) if len(raw) <= MAX_JSON else None
            if not isinstance(result, dict):
                raise ValueError()
            return result
        except (ValueError, TypeError):
            raise FirebaseError(f"Firebase {method} returned invalid data; no retry was made.") from None

    def releases(self):
        results, page_token, seen = [], "", set()
        for _ in range(100):
            query = {"pageSize": 100}
            if page_token:
                query["pageToken"] = page_token
            response = self.request("GET", self.app + "/releases", query=query)
            items = response.get("releases", [])
            if not isinstance(items, list):
                raise FirebaseError("Firebase returned an invalid releases list.")
            for item in items:
                if not isinstance(item, dict):
                    raise FirebaseError("Firebase returned an invalid release.")
                self.validate_resource(item.get("name"))
                positive_code(item.get("buildVersion"))
                results.append(item)
            page_token = response.get("nextPageToken", "")
            if not page_token:
                return results
            if not isinstance(page_token, str) or page_token in seen:
                raise FirebaseError("Firebase returned invalid pagination metadata.")
            seen.add(page_token)
        raise FirebaseError("Firebase release pagination exceeded the safety limit.")

    def upload(self, apk, *, sleep=time.sleep):
        operation = self.request("POST", self.app + "/releases:upload", media=apk)
        operation_name = self.validate_resource(operation.get("name"), operation=True)
        for attempt in range(60):
            if operation.get("done") is True:
                if operation.get("error"):
                    raise FirebaseError("Firebase could not process the uploaded APK; inspect Console before retrying.")
                response = operation.get("response", {})
                if not isinstance(response, dict) or response.get("result") not in ("RELEASE_CREATED", "RELEASE_UPDATED", "RELEASE_UNMODIFIED"):
                    raise FirebaseError("Firebase did not confirm the upload result.")
                uploaded = response.get("release", {})
                if not isinstance(uploaded, dict):
                    raise FirebaseError("Firebase returned an invalid uploaded release.")
                self.validate_resource(uploaded.get("name"))
                return uploaded
            if attempt:
                sleep(5)
            operation = self.request("GET", operation_name)
            if operation.get("name") != operation_name:
                raise FirebaseError("Firebase changed the upload operation resource.")
        raise FirebaseError("Firebase APK processing is still pending; inspect Console before another publication.")


def positive_code(value):
    try:
        if type(value) is bool:
            raise release.ReleaseError()
        return release.positive_code(value)
    except release.ReleaseError:
        raise FirebaseError("Invalid Android versionCode.") from None


def validate_state(state):
    if (not isinstance(state, dict) or set(state) != STATE_KEYS or type(state.get("schema")) is not int
            or state["schema"] != 1 or state.get("package") != PACKAGE):
        raise FirebaseError("Invalid beta source state.")
    if type(state.get("code")) is not int:
        raise FirebaseError("Invalid beta versionCode type.")
    positive_code(state["code"])
    if not isinstance(state.get("name"), str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+-beta\.[1-9][0-9]*", state["name"]):
        raise FirebaseError("Invalid beta version name.")
    if not isinstance(state.get("commit"), str) or not re.fullmatch(r"[a-f0-9]{40}", state["commit"]):
        raise FirebaseError("Invalid beta source commit.")
    if not isinstance(state.get("fingerprint"), str) or not re.fullmatch(r"[a-f0-9]{64}", state["fingerprint"]):
        raise FirebaseError("Invalid Android input fingerprint.")
    return state


def read_state_archive(raw):
    if len(raw) > MAX_STATE_ZIP:
        raise FirebaseError("The beta state archive is too large.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if len(entries) != 1 or entries[0].filename != "state.json" or entries[0].file_size > 8192:
                raise FirebaseError("The beta state archive contains unexpected files.")
            return validate_state(json.loads(archive.read(entries[0])))
    except (zipfile.BadZipFile, ValueError, KeyError, RuntimeError):
        raise FirebaseError("The beta state archive is invalid.") from None


def trusted_publisher_run(run, repository, commit):
    return (isinstance(run, dict) and run.get("path") == WORKFLOW
            and run.get("status") == "completed" and run.get("conclusion") == "success"
            and run.get("event") in ("workflow_run", "workflow_dispatch")
            and run.get("head_branch") == "main" and run.get("head_sha") == commit
            and (run.get("repository") or {}).get("full_name") == repository
            and (run.get("head_repository") or {}).get("full_name") == repository)


def previous_fingerprint(repository, releases):
    """Missing/expired/untrusted state never suppresses a release."""
    if not releases:
        return None
    highest = max(positive_code(item["buildVersion"]) for item in releases)
    latest_names = {item.get("displayVersion") for item in releases if positive_code(item["buildVersion"]) == highest}
    # Start from successful runs of this publisher, not global artifact names:
    # a PR may choose artifact names but cannot flood this trusted run selection.
    # Without search filters GitHub does not impose its 1,000-result search cap.
    for page in range(1, 101):
        response = gh_json(repository, f"actions/workflows/android-firebase-beta.yml/runs?per_page=100&page={page}")
        runs = response.get("workflow_runs", [])
        if not isinstance(runs, list):
            raise FirebaseError("GitHub returned invalid publisher run metadata.")
        for run in runs:
            if not isinstance(run, dict) or not trusted_publisher_run(run, repository, run.get("head_sha")):
                continue
            run_id = run.get("id")
            if type(run_id) is not int or run_id == int(os.environ.get("GITHUB_RUN_ID", "0")):
                continue
            artifacts = gh_json(repository, f"actions/runs/{run_id}/artifacts?per_page=100").get("artifacts", [])
            if not isinstance(artifacts, list):
                raise FirebaseError("GitHub returned invalid state artifact metadata.")
            for artifact in artifacts:
                if not isinstance(artifact, dict) or artifact.get("expired") is not False or artifact.get("name") != STATE_ARTIFACT:
                    continue
                artifact_id, size, digest = artifact.get("id"), artifact.get("size_in_bytes"), artifact.get("digest", "")
                if (type(artifact_id) is not int or type(size) is not int or not 1 <= size <= MAX_STATE_ZIP
                        or not isinstance(digest, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", digest)):
                    continue
                raw = gh_bytes(repository, f"actions/artifacts/{artifact_id}/zip", limit=MAX_STATE_ZIP)
                if hashlib.sha256(raw).hexdigest() != digest.removeprefix("sha256:"):
                    continue
                try:
                    state = read_state_archive(raw)
                except FirebaseError:
                    continue
                if (state["code"] == highest and state["name"] in latest_names
                        and trusted_publisher_run(run, repository, state["commit"])):
                    return state["fingerprint"]
        if len(runs) < 100:
            return None
    raise FirebaseError("Publisher state history exceeded the safety limit; inspect Actions before publishing.")


def make_plan(sections, *, commit, repository, run_number, fingerprint, github_max=0,
              firebase_releases=None, previous=None, floor=0):
    if type(run_number) is not int or run_number < 1:
        raise FirebaseError("Invalid workflow run number.")
    numbered = next((name for name in sections if name != "Unreleased"), None)
    if not numbered:
        raise FirebaseError("The Android changelog needs a versioned section.")
    release.version_key(numbered)
    firebase_max = max((positive_code(item["buildVersion"]) for item in firebase_releases or []), default=0)
    for value in (github_max, floor):
        if type(value) is not int or not 0 <= value <= release.MAX_VERSION_CODE:
            raise FirebaseError("Invalid versionCode baseline.")
    code = positive_code(max(100_000 + run_number, firebase_max + 1, github_max + 1, floor))
    name = f"{numbered.split('-', 1)[0].split('+', 1)[0]}-beta.{run_number}"
    state = validate_state({"schema": 1, "package": PACKAGE, "name": name, "code": code,
                            "commit": commit, "fingerprint": fingerprint})
    body = sections.get("Unreleased", "")
    if not release.has_changes(body):
        body = sections[numbered]
    notes = "Wersja testowa.\n" + "\n".join(line.lstrip("#*- ").strip() for line in body.splitlines() if line.strip())[:2000]
    return {"state": state, "repository": repository_name(repository), "notes": notes,
            "provisional": firebase_releases is None, "skip": fingerprint == previous}


def validate_plan(plan, *, live=False):
    if not isinstance(plan, dict):
        raise FirebaseError("Invalid Firebase beta plan.")
    validate_state(plan.get("state"))
    repository_name(plan.get("repository"))
    if not isinstance(plan.get("notes"), str) or not 1 <= len(plan["notes"]) <= 2500:
        raise FirebaseError("Invalid beta release notes.")
    if live and (plan.get("provisional") is not False or plan.get("skip") is not False):
        raise FirebaseError("An offline preview or skipped beta cannot be published.")
    return plan["state"]


def receive_handoff(repository, artifact_id, digest, run_id, kind):
    """Read one immutable artifact selected by the producing job's ID/digest outputs.

    Never search by name or extract an archive into the checkout. A failed-job
    retry may legitimately reuse an artifact from an earlier attempt of this run.
    """
    if (not re.fullmatch(r"[1-9][0-9]*", str(artifact_id))
            or not re.fullmatch(r"[1-9][0-9]*", str(run_id))
            or not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest)
            or kind not in ("plan", "unsigned")):
        raise FirebaseError("Invalid same-run artifact handoff.")
    maximum = MAX_STATE_ZIP if kind == "plan" else MAX_BUILD_ZIP
    metadata = gh_json(repository, f"actions/artifacts/{artifact_id}")
    size = metadata.get("size_in_bytes")
    name = metadata.get("name")
    workflow_run = metadata.get("workflow_run")
    if (type(metadata.get("id")) is not int or metadata["id"] != int(artifact_id) or metadata.get("expired") is not False
            or type(size) is not int or not 1 <= size <= maximum
            or metadata.get("digest") != "sha256:" + digest
            or not isinstance(workflow_run, dict) or type(workflow_run.get("id")) is not int
            or workflow_run["id"] != int(run_id) or not isinstance(name, str)
            or not re.fullmatch(r"android-firebase-beta-" + kind + "-" + str(run_id) + r"-[1-9][0-9]*",
                                name)):
        raise FirebaseError("The artifact does not match this run and its producing job.")
    raw = gh_bytes(repository, f"actions/artifacts/{artifact_id}/zip", limit=maximum)
    if hashlib.sha256(raw).hexdigest() != digest:
        raise FirebaseError("The handoff archive digest does not match its producing job.")
    filename, expanded = ("plan.json", 8192) if kind == "plan" else ("unsigned.apk", MAX_APK)
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if (len(entries) != 1 or entries[0].filename != filename
                    or not 1 <= entries[0].file_size <= expanded or entries[0].flag_bits & 1):
                raise FirebaseError("The handoff archive contains unexpected files.")
            return archive.read(entries[0])
    except (zipfile.BadZipFile, ValueError, KeyError, RuntimeError):
        raise FirebaseError("The handoff archive is invalid.") from None


def validate_apk(apk):
    if not apk.is_file() or not 1 <= apk.stat().st_size <= MAX_APK:
        raise FirebaseError("A nonempty APK within the size limit is required.")
    try:
        with zipfile.ZipFile(apk) as archive:
            entries = archive.infolist()
            names = archive.namelist()
            if (len(names) != len(set(names)) or len(names) > 100_000
                    or sum(entry.file_size for entry in entries) > MAX_APK_EXPANDED
                    or any(entry.flag_bits & 1 for entry in entries)):
                raise FirebaseError("The APK archive exceeds the limits or contains ambiguous files.")
            if "AndroidManifest.xml" not in names or "classes.dex" not in names:
                raise FirebaseError("The APK is missing its manifest or code.")
            if any(name.startswith("assets/decks") for name in archive.namelist()) or archive.testzip() is not None:
                raise FirebaseError("The APK is corrupt or contains retired deck assets.")
    except zipfile.BadZipFile:
        raise FirebaseError("The file is not a valid APK archive.") from None


def stage_unsigned_apk(source, destination):
    """Remove the unprivileged build's ephemeral signatures without any owner key.

    Rebuilding the ZIP also drops the v2/v3 signing block outside ZIP entries.
    The isolated signer aligns and signs this file again with official SDK tools.
    """
    validate_apk(source)
    if source.resolve() == destination.resolve():
        raise FirebaseError("The unsigned APK must use a separate staging path.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    signature = re.compile(r"META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC)|SIG-[^/]+)", re.I)
    with zipfile.ZipFile(source) as archive, zipfile.ZipFile(destination, "w") as output:
        for entry in archive.infolist():
            if not signature.fullmatch(entry.filename):
                output.writestr(entry, archive.read(entry))
    validate_apk(destination)


def publish(api, plan, apk, groups, *, check_source):
    state = validate_plan(plan, live=True)
    validate_apk(apk)
    maximum = max((positive_code(item["buildVersion"]) for item in api.releases()), default=0)
    if state["code"] <= maximum:
        raise FirebaseError("A Firebase build already uses this versionCode or a higher one; prepare a new plan.")
    check_source()
    uploaded = api.upload(apk)
    if positive_code(uploaded.get("buildVersion")) != state["code"] or uploaded.get("displayVersion") != state["name"]:
        raise FirebaseError("Firebase did not confirm the expected APK version; no distribution was attempted.")
    name = api.validate_resource(uploaded.get("name"))
    check_source()
    updated = api.request("PATCH", name, data={"name": name, "releaseNotes": {"text": plan["notes"]}},
                          query={"updateMask": "releaseNotes.text"})
    if updated.get("name") != name or updated.get("releaseNotes", {}).get("text") != plan["notes"]:
        raise FirebaseError("Firebase did not confirm the release notes; no distribution was attempted.")
    check_source()
    response = api.request("POST", name + ":distribute", data={"groupAliases": groups})
    if response:
        raise FirebaseError("Firebase returned an unexpected distribution response; inspect Console before retrying.")
    return state


def append_summary(text):
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as output:
            output.write(text + "\n")


def output_values(**values):
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
            for key, value in values.items():
                output.write(f"{key}={value}\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("preview", "check-config", "prepare", "publish", "verify-certificate",
                                         "receive-plan", "receive-apk", "stage-apk", "check-build-config"))
    parser.add_argument("--apk", type=Path)
    parser.add_argument("--directory", type=Path)
    args = parser.parse_args(argv)
    directory = args.directory or Path(os.environ.get("RUNNER_TEMP", "tmp")) / "hiciarz-firebase-beta"
    try:
        if args.mode == "verify-certificate":
            verify_signing_certificate(sys.stdin.buffer.read(MAX_CERTIFICATE_OUTPUT + 1),
                                       os.environ.get("ANDROID_SIGNING_CERT_SHA256", ""))
            print("The APK signing certificate matches the configured key.")
            return 0
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
        preview = args.mode == "preview"
        repository = os.environ.get("GITHUB_REPOSITORY", "")
        commit = execution_context(os.environ.get("GITHUB_EVENT_NAME", ""), event, repository,
                                   os.environ.get("GITHUB_REF", ""), os.environ.get("FIREBASE_BETA_ENABLED", ""),
                                   preview=preview, sha=os.environ.get("GITHUB_SHA", ""))
        verify_source(commit, repository, current_main=not preview)
        if args.mode == "check-build-config":
            client = firebase_client_resources(os.environ.get("FIREBASE_ANDROID_CONFIG_BASE64", ""))
            plan = json.loads((directory / "plan.json").read_text(encoding="utf-8"))
            state = validate_plan(plan, live=True)
            fingerprint = source_fingerprint(os.environ.get("SPOTIFY_CLIENT_ID", ""),
                os.environ.get("ANDROID_SIGNING_CERT_SHA256", ""), client["google_app_id"],
                os.environ.get("FIREBASE_ANDROID_CONFIG_BASE64", ""))
            if state["commit"] != commit or plan["repository"] != repository or state["fingerprint"] != fingerprint:
                raise FirebaseError("The build client configuration does not match this run's verified plan.")
            print("Build client configuration matches the verified plan; no Firebase access was used.")
            return 0
        if args.mode in ("receive-plan", "receive-apk", "stage-apk"):
            directory.mkdir(parents=True, exist_ok=True)
            if args.mode == "stage-apk":
                if args.apk is None:
                    raise FirebaseError("Staging requires --apk.")
                stage_unsigned_apk(args.apk, directory / "unsigned.apk")
            else:
                kind = "plan" if args.mode == "receive-plan" else "unsigned"
                raw = receive_handoff(repository, os.environ.get("HANDOFF_ARTIFACT_ID", ""),
                                      os.environ.get("HANDOFF_ARTIFACT_DIGEST", ""),
                                      os.environ.get("GITHUB_RUN_ID", ""), kind)
                if kind == "plan":
                    plan = json.loads(raw)
                    state = validate_plan(plan, live=True)
                    if state["commit"] != commit or plan["repository"] != repository:
                        raise FirebaseError("The plan does not match this run's checked source.")
                    (directory / "plan.json").write_bytes(raw)
                    output_values(name=state["name"], code=state["code"])
                else:
                    apk = directory / "unsigned.apk"
                    apk.write_bytes(raw)
                    validate_apk(apk)
            print("Verified same-run build handoff." if args.mode != "stage-apk" else "Staged unsigned APK without distribution credentials.")
            return 0
        if not preview:
            validate_config(os.environ)
            if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
                verify_successful_checks(commit, repository)
        if args.mode == "check-config":
            print("Firebase publishing configuration is present and structurally valid.")
            return 0
        fingerprint = source_fingerprint(os.environ.get("SPOTIFY_CLIENT_ID", ""),
                                         os.environ.get("ANDROID_SIGNING_CERT_SHA256", ""),
                                         os.environ.get("FIREBASE_APP_ID", ""),
                                         os.environ.get("FIREBASE_ANDROID_CONFIG_BASE64", ""))
        directory.mkdir(parents=True, exist_ok=True)
        api = FirebaseAPI(os.environ.get("FIREBASE_ACCESS_TOKEN", ""), os.environ.get("FIREBASE_APP_ID", "")) if not preview else None
        if args.mode == "publish":
            plan = json.loads((directory / "plan.json").read_text(encoding="utf-8"))
            state = validate_plan(plan, live=True)
            if state["commit"] != commit or plan["repository"] != repository or state["fingerprint"] != fingerprint:
                raise FirebaseError("The plan does not match this workflow's source and configuration.")
            if state["code"] <= github_max_code(repository):
                raise FirebaseError("GitHub has already published this versionCode or a higher one.")
            if args.apk is None:
                raise FirebaseError("Publishing requires --apk.")
            state = publish(api, plan, args.apk, tester_groups(os.environ.get("FIREBASE_TESTER_GROUPS", "")),
                            check_source=lambda: verify_source(commit, repository))
            (directory / "state.json").write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
            output_values(published="true")
            append_summary(f"### Firebase beta published\n\nVersion `{state['name']}` · versionCode `{state['code']}` · source `{commit}`.\n\nTesters receive a release notification and approve the update on their devices.")
            print(f"Firebase confirmed distribution of versionCode {state['code']}.")
        else:
            sections = release.parse_changelog(Path("android-app/CHANGELOG.md").read_text(encoding="utf-8"))
            items = api.releases() if api else None
            floor_value = os.environ.get("FIREBASE_VERSION_CODE_FLOOR", "").strip()
            plan = make_plan(sections, commit=commit, repository=repository,
                             run_number=int(os.environ.get("GITHUB_RUN_NUMBER", "1")), fingerprint=fingerprint,
                             github_max=github_max_code(repository) if not preview else 0,
                             firebase_releases=items,
                             previous=previous_fingerprint(repository, items) if items else None,
                             floor=positive_code(floor_value) if floor_value else 0)
            (directory / "plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            state = plan["state"]
            output_values(name=state["name"], code=state["code"], publish="false" if plan["skip"] else "true")
            message = ("Dry run: no Firebase authentication, signing, build or upload. VersionCode is provisional."
                       if preview else "Android inputs unchanged: build and upload skipped." if plan["skip"] else "Live plan ready; no APK uploaded yet.")
            append_summary(f"### Firebase beta\n\nVersion `{state['name']}` · versionCode `{state['code']}` · source `{commit}`.\n\n{message}")
            print(message)
        return 0
    except FirebaseError as error:
        # All FirebaseError messages are fixed local text; never interpolate data.
        print(f"Firebase beta failed: {error}", file=sys.stderr)
        return 1
    except (release.ReleaseError, OSError, ValueError, KeyError):
        # Errors may originate from parsers/files containing private configuration;
        # do not stringify them at the top level. API helpers already sanitize data.
        print("Firebase beta failed. Check the setup, CI and Console; no automatic mutation retry was made.", file=sys.stderr)
        return 1


def github_max_code(repository):
    published = release.published_android_releases(release.load_releases(repository))
    return max((release.published_version_code(repository, item["tag_name"]) for item in published), default=0)


if __name__ == "__main__":
    sys.exit(main())
