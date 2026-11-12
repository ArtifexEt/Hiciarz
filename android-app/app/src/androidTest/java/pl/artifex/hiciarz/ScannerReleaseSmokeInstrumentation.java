package pl.artifex.hiciarz;

import android.app.Instrumentation;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;

/** Framework runner: the AndroidX runner depends on unminified Kotlin classes. */
public final class ScannerReleaseSmokeInstrumentation extends Instrumentation {
    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override public void onStart() {
        super.onStart();
        ScannerReleaseSmokeTest tests = new ScannerReleaseSmokeTest(this);
        StringBuilder output = new StringBuilder("\n");
        int failures = 0;
        failures += run("mlKitManifestRegistrarsKeepTheirReflectiveConstructors", output,
                tests::mlKitManifestRegistrarsKeepTheirReflectiveConstructors, tests);
        failures += run("minifiedCameraReadsAnActualQrCodeAndReopensAfterRotation", output,
                tests::minifiedCameraReadsAnActualQrCodeAndReopensAfterRotation, tests);
        if (failures == 0) output.append("\nOK (2 tests)\n");
        else output.append("\nFAILURES!!!\nTests run: 2, Failures: ").append(failures).append('\n');
        Bundle results = new Bundle();
        results.putString("stream", output.toString());
        finish(-1, results);
    }

    private int run(String name, StringBuilder output, Check check, ScannerReleaseSmokeTest tests) {
        Bundle status = new Bundle();
        status.putString("class", ScannerReleaseSmokeTest.class.getName());
        status.putString("test", name);
        status.putInt("numtests", 2);
        sendStatus(1, status);
        try {
            check.run();
            status.putString("stream", ".");
            sendStatus(0, status);
            return 0;
        } catch (Throwable failure) {
            StringWriter trace = new StringWriter();
            failure.printStackTrace(new PrintWriter(trace));
            output.append(name).append(":\n").append(trace);
            status.putString("stack", trace.toString());
            status.putString("stream", "E");
            sendStatus(-2, status);
            return 1;
        } finally {
            captureScreen();
            tests.finish();
        }
    }

    private void captureScreen() {
        // The framework terminates the instrumented app when finish() returns.
        // Capture its final/failing screen before that teardown; shell owns this
        // emulator-only output, so CI can pull it from a non-debuggable APK.
        try (ParcelFileDescriptor.AutoCloseInputStream input = new ParcelFileDescriptor.AutoCloseInputStream(
                getUiAutomation().executeShellCommand("screencap -p /sdcard/hiciarz-camera-smoke.png"))) {
            byte[] drain = new byte[256];
            while (input.read(drain) != -1) { /* Wait for screencap completion. */ }
        } catch (IOException ignored) {
            // A screenshot failure must not conceal the actual test result.
        }
    }

    private interface Check { void run() throws Exception; }
}
