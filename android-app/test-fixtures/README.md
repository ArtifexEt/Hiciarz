# Camera smoke fixture

`scanner-card.png` is a deterministic QR generated with the repository's `qrcode` dependency. It contains the existing compact Hiciarz card format, including the **disco** skin:

```text
https://artifexet.github.io/Hiciarz/#2ds2uFaJJtFpPDc5Pa95XzTvg
```

The bundled deck identifies this recording as **Dean Martin — Let It Snow! Let It Snow! Let It Snow! (1959)**. The release camera smoke test checks that these decoded card details appear after a real CameraX → ML Kit frame, without Spotify, login or network access.

Emulator camera source:

```sh
-camera-back imagefile:<absolute-path>/android-app/test-fixtures/scanner-card.png
```

The fixture is only used by tests and is not packaged in the released application. Normal UI tests use `-camera-back emulated`, excluding `ScannerReleaseSmokeTest`; a separate smoke run installs the minified release APK and selects only that framework-level test class.
