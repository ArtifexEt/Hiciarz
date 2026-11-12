# Camera smoke fixture

`scanner-card.png` is a deterministic QR generated with the repository's `qrcode` dependency. It contains the existing compact Hiciarz card format, including the **disco** skin:

```text
https://artifexet.github.io/Hiciarz/#2ds2uFaJJtFpPDc5Pa95XzTvg
```

The bundled deck identifies this recording as **Dean Martin — Let It Snow! Let It Snow! Let It Snow! (1959)**. The release camera smoke test checks that these decoded card details appear after a real CameraX → ML Kit frame, without Spotify, login or network access.

The 200 px QR sits at (30, 30) on a white 640 × 480 canvas. This placement keeps its finder markers inside both emulator analysis and preview crops; larger centered codes are clipped by the imagefile backend. The final PNG is independently decodable with ZXing.

Emulator camera source:

```sh
-camera-back imagefile:<absolute-path>/android-app/test-fixtures/scanner-card.png
```

Use a source path without spaces. Emulator 37.3.9 internally splits imagefile paths even when the shell argument is quoted; copy the PNG to `/tmp/hiciarz-scanner-card.png` if the checkout path contains spaces.

The fixture is only used by tests and is not packaged in the released application. Normal UI tests use `-camera-back emulated`, excluding `ScannerReleaseSmokeTest`. A separate smoke run installs the minified release APK and debug test APK signed with the same test key, then invokes the framework-only runner:

```sh
./gradlew :app:assembleRelease :app:assembleDebugAndroidTest \
  -PhiciarzTestRunner=pl.artifex.hiciarz.ScannerReleaseSmokeInstrumentation
adb shell am instrument -w -r \
  pl.artifex.hiciarz.test/pl.artifex.hiciarz.ScannerReleaseSmokeInstrumentation
```

The AndroidX runner assumes unminified Kotlin runtime names, so it cannot safely instrument a separately optimized release APK. This runner uses Android framework APIs and leaves production shrinking unchanged. A successful run ends with `OK (2 tests)`.
