#!/usr/bin/env python3
"""Validate an Android release and prepare notes without publishing anything."""

import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys


MAX_VERSION_CODE = 2_100_000_000
VERSION = re.compile(
    r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
)


class ReleaseError(ValueError):
    pass


def version_key(version):
    match = VERSION.fullmatch(version)
    if not match:
        raise ReleaseError(f"Invalid semantic version: {version!r}.")
    identifiers = (match[4] or "").split(".") if match[4] else []
    if any(part.isdigit() and len(part) > 1 and part.startswith("0") for part in identifiers):
        raise ReleaseError(f"Numeric prerelease identifiers cannot have leading zeroes: {version}.")
    prerelease = tuple((0, int(part)) if part.isdigit() else (1, part) for part in identifiers)
    return (int(match[1]), int(match[2]), int(match[3]), not identifiers, prerelease)


def has_changes(body):
    for line in re.sub(r"<!--.*?-->", "", body, flags=re.S).splitlines():
        content = line.strip()
        if not content or re.match(r"^#{1,6}(?:\s|$)", content):
            continue
        if re.fullmatch(r"(?:[-*_]\s*){3,}|`{3,}|~{3,}", content):
            continue
        if re.sub(r"^(?:[-*+]\s*|[0-9]+[.)]\s*)", "", content).strip():
            return True
    return False


def parse_changelog(text):
    sections = {}
    current = None
    body = []
    fence = None
    for line in re.sub(r"<!--.*?-->", "", text, flags=re.S).splitlines():
        stripped = line.lstrip()
        marker = re.match(r"^(`{3,}|~{3,})", stripped)
        if marker:
            if fence is None:
                fence = marker[1][0]
            elif marker[1][0] == fence:
                fence = None
        if fence is None and re.match(r"^##(?:\s|$)", line):
            match = re.fullmatch(r"##\s+\[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*", line)
            if not match:
                raise ReleaseError(f"Invalid changelog heading: {line!r}. Use ## [version] - YYYY-MM-DD.")
            if current is not None:
                sections[current] = "\n".join(body).strip()
            current = "Unreleased" if match[1].lower() == "unreleased" else match[1]
            if current in sections:
                raise ReleaseError(f"Duplicate changelog section: {current}.")
            if current != "Unreleased":
                version_key(current)
            if match[2]:
                try:
                    datetime.date.fromisoformat(match[2])
                except ValueError as error:
                    raise ReleaseError(f"Invalid changelog date: {match[2]}.") from error
            body = []
        elif current is not None:
            body.append(line)
    if current is not None:
        sections[current] = "\n".join(body).strip()
    versions = [version for version in sections if version != "Unreleased"]
    if not versions:
        raise ReleaseError("The changelog needs at least one versioned section.")
    for version in versions:
        if not has_changes(sections[version]):
            raise ReleaseError(f"Changelog section {version} has no release changes.")
    return sections


def command_output(*args):
    try:
        result = subprocess.run(args, check=False, capture_output=True, text=True)
    except OSError as error:
        raise ReleaseError(f"Cannot run {args[0]}: {error}.") from error
    if result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise ReleaseError(f"{args[0]} failed ({result.returncode}): {detail}")
    return result.stdout


def load_releases(repository):
    response = command_output(
        "gh", "api", "--paginate", "--slurp", f"repos/{repository}/releases?per_page=100"
    )
    try:
        pages = json.loads(response)
        if not isinstance(pages, list) or any(not isinstance(page, list) for page in pages):
            raise ValueError("Expected an array of release pages")
        releases = [release for page in pages for release in page]
        if any(not isinstance(release, dict) or not isinstance(release.get("tag_name"), str)
               for release in releases):
            raise ValueError("Missing or invalid release tag_name")
        return releases
    except (ValueError, TypeError) as error:
        raise ReleaseError(f"Invalid GitHub releases response: {error}.") from error


def published_android_releases(releases):
    android = [release for release in releases if release["tag_name"].startswith("android-v")
               and not release.get("draft") and release.get("published_at")]
    for release in android:
        version_key(release["tag_name"][len("android-v"):])
    return sorted(android, key=lambda release: release["published_at"], reverse=True)


def published_version_code(repository, tag):
    text = command_output("gh", "release", "download", tag, "--repo", repository,
                          "--pattern", "BUILD-INFO.txt", "--output", "-")
    fields = {}
    for line in text.splitlines():
        key, separator, value = line.partition("=")
        if not separator or key in fields:
            raise ReleaseError(f"Invalid BUILD-INFO.txt in {tag}.")
        fields[key] = value
    if fields.get("applicationId") != "pl.artifex.hiciarz" or fields.get("versionName") != tag[len("android-v"):]:
        raise ReleaseError(f"BUILD-INFO.txt does not match Android release {tag}.")
    return positive_code(fields.get("versionCode", ""), f"versionCode in {tag}")


def positive_code(value, label="versionCode"):
    if not re.fullmatch(r"[1-9][0-9]{0,9}", str(value)) or int(value) > MAX_VERSION_CODE:
        raise ReleaseError(f"{label} must be a positive integer no greater than {MAX_VERSION_CODE}.")
    return int(value)


def resolve_version(sections, version_input, ref_type, ref_name):
    version = version_input.strip()
    if ref_type == "tag":
        if not ref_name.startswith("android-v"):
            raise ReleaseError("Android release tags must start with android-v.")
        tagged_version = ref_name[len("android-v"):]
        if version and version != tagged_version:
            raise ReleaseError("The input version does not match the Android tag.")
        version = tagged_version
    if not version:
        version = next(version for version in sections if version != "Unreleased")
    version_key(version)
    if version not in sections:
        raise ReleaseError(f"Missing changelog section for {version}.")
    return version


def check_git_refs(tag, commit, previous_tag):
    command_output("git", "check-ref-format", f"refs/tags/{tag}")
    head = command_output("git", "rev-parse", "HEAD^{commit}").strip()
    if commit and commit != head:
        raise ReleaseError("The requested commit does not match the checked-out source.")
    commit = head
    if not re.fullmatch(r"[0-9a-fA-F]{40}", commit):
        raise ReleaseError("The checked-out commit is not a valid full Git SHA.")
    existing = subprocess.run(["git", "show-ref", "--verify", "--quiet", f"refs/tags/{tag}"], check=False)
    if existing.returncode == 0:
        tagged_commit = command_output("git", "rev-parse", f"{tag}^{{commit}}").strip()
        if tagged_commit != commit:
            raise ReleaseError("The Android tag points to another commit. Choose a new version.")
    elif existing.returncode != 1:
        raise ReleaseError("Cannot inspect the existing Android tag.")
    if previous_tag:
        ancestor = subprocess.run(["git", "merge-base", "--is-ancestor", f"{previous_tag}^{{commit}}", commit],
                                  check=False, capture_output=True, text=True)
        if ancestor.returncode:
            raise ReleaseError(f"The source must include previous release {previous_tag}; fetch all tags and check ancestry.")
    return commit


def render_notes(body, *, repository, version, previous_tag, commit):
    base = f"https://github.com/{repository}"
    tag = f"android-v{version}"
    comparison = (f"Poprzednia wersja: [{previous_tag.removeprefix('android-v')}]"
                  f"({base}/releases/tag/{previous_tag}).\n\n"
                  f"[Pełne porównanie zmian]({base}/compare/{previous_tag}...{tag})"
                  if previous_tag else "Pierwsze wydanie Androida.")
    return (f"## Co się zmieniło\n\n{body}\n\n{comparison}\n\n"
            f"## Instalacja\n\n"
            f"Pobierz `hiciarz-android-{version}-test.apk` i otwórz plik na telefonie z Androidem 8.0 lub nowszym. "
            f"To wydanie testowe. [Instrukcja instalacji i konfiguracji Spotify]({base}/blob/{commit}/android-app/README.md).\n\n"
            "Suma kontrolna APK jest w pliku `.apk.sha256`, odciski podpisu w `SIGNING-CERTIFICATE.txt`, "
            "a wersja i commit źródeł w `BUILD-INFO.txt`.\n")


def prepare_release(sections, *, version_input="", version_code="", repository, commit="", run_number=1,
                    ref_type="", ref_name=""):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*", repository):
        raise ReleaseError("Specify a valid GitHub repository as owner/name.")
    version = resolve_version(sections, version_input, ref_type, ref_name)
    tag = f"android-v{version}"
    releases = load_releases(repository)
    if any(release["tag_name"] == tag for release in releases):
        raise ReleaseError(f"Release {tag} already exists, including drafts. Choose a new version.")
    published = published_android_releases(releases)
    if any(version_key(version) <= version_key(release["tag_name"][len("android-v"):]) for release in published):
        raise ReleaseError("The release version must be newer than every published Android version.")
    previous_tag = published[0]["tag_name"] if published else ""
    commit = check_git_refs(tag, commit, previous_tag)
    highest_code = max((published_version_code(repository, release["tag_name"]) for release in published), default=0)
    if not isinstance(run_number, int) or run_number < 1:
        raise ReleaseError("The workflow run number must be a positive integer.")
    code = positive_code(version_code if version_code else max(100000 + run_number, highest_code + 1))
    if code <= highest_code:
        raise ReleaseError(f"versionCode must be greater than the published maximum {highest_code}.")
    plan = {"tag": tag, "name": version, "code": code, "previous_tag": previous_tag, "commit": commit}
    notes = render_notes(sections[version], repository=repository, version=version,
                         previous_tag=previous_tag, commit=commit)
    return plan, notes


def write_plan(plan, notes, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "RELEASE-NOTES.md").write_text(notes, encoding="utf-8")
    (output_dir / "RELEASE-PLAN.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
            for key in ("tag", "name", "code", "previous_tag"):
                output.write(f"{key}={plan[key]}\n")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as summary:
            summary.write(f"# Android {plan['name']}\n\nTag: `{plan['tag']}` · versionCode: `{plan['code']}`\n\n{notes}\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--changelog", type=Path, default=Path("android-app/CHANGELOG.md"))
    parser.add_argument("--version", default="")
    parser.add_argument("--version-code", default="")
    parser.add_argument("--output-dir", type=Path, default=Path("android-app/release-artifacts"))
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--run-number", type=int, default=int(os.environ.get("GITHUB_RUN_NUMBER", "1")))
    parser.add_argument("--ref-type", default=os.environ.get("GITHUB_REF_TYPE", ""))
    parser.add_argument("--ref-name", default=os.environ.get("GITHUB_REF_NAME", ""))
    parser.add_argument("--check-changelog", action="store_true")
    args = parser.parse_args(argv)
    try:
        sections = parse_changelog(args.changelog.read_text(encoding="utf-8"))
        if args.check_changelog:
            print(f"Valid Android changelog: {len(sections) - ('Unreleased' in sections)} versioned sections.")
            return 0
        plan, notes = prepare_release(sections, version_input=args.version, version_code=args.version_code,
                                      repository=args.repository, commit=args.commit, run_number=args.run_number,
                                      ref_type=args.ref_type, ref_name=args.ref_name)
        write_plan(plan, notes, args.output_dir)
        print(json.dumps(plan, indent=2))
        return 0
    except (ReleaseError, OSError) as error:
        print(f"Release preflight failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
