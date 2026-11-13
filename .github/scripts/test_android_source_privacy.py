"""Public-source invariants; failures never print configuration values."""

import fnmatch
from pathlib import Path, PurePosixPath
import re
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]


class PublicAndroidSourceTests(unittest.TestCase):
    def test_signing_stores_and_owner_credential_files_are_not_tracked(self):
        tracked = subprocess.run(
            ["git", "ls-files", "-z"], cwd=ROOT, check=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        ).stdout.split(b"\0")
        patterns = (
            "*.jks", "*.keystore", "*.p12", "*.pfx", "*.key",
            "google-services.json", "gha-creds-*.json", "*adminsdk*.json",
            "*service-account*.json", "*credentials*.json",
        )
        for raw_path in tracked:
            if not raw_path:
                continue
            try:
                name = PurePosixPath(raw_path.decode("utf-8", errors="strict")).name.lower()
            except UnicodeDecodeError:
                self.fail("Tracked filenames must be UTF-8; contents withheld.")
            if any(fnmatch.fnmatchcase(name, pattern) for pattern in patterns):
                self.fail("Remove signing stores and owner credential files from tracked source; details withheld.")

    def test_android_environment_template_requires_the_cloners_own_values(self):
        template = ROOT / "android-app" / ".env.example"
        safe_defaults = {
            "HICIARZ_REQUIRE_SPOTIFY_CONFIG": "false",
            "HICIARZ_PRODUCTION_SIGNING": "false",
        }
        variables = set()
        for number, line in enumerate(template.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            name, separator, value = stripped.partition("=")
            if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", name) or name in variables:
                self.fail(f"Invalid or duplicate template field at line {number}; contents withheld.")
            variables.add(name)
            if value.strip() != safe_defaults.get(name, ""):
                self.fail(f"Configuration template contains owner data or unsafe defaults at line {number}; value withheld.")
        required = {
            "SPOTIFY_CLIENT_ID", "FIREBASE_PROJECT_ID", "FIREBASE_APP_ID",
            "FIREBASE_WORKLOAD_IDENTITY_PROVIDER", "FIREBASE_SERVICE_ACCOUNT",
            "HICIARZ_KEYSTORE_FILE", "HICIARZ_KEYSTORE_PASSWORD",
            "HICIARZ_KEY_ALIAS", "HICIARZ_KEY_PASSWORD",
        }
        self.assertTrue(required.issubset(variables), "Configuration template is missing required owner fields.")


if __name__ == "__main__":
    unittest.main()
