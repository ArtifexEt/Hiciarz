package pl.artifex.hiciarz;

import android.Manifest;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.UiAutomation;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertTrue;

/**
 * Black-box regression against the minified release APK. No application class,
 * resource, BuildConfig or Kotlin runtime is referenced: a debug-built test APK
 * can instrument the separately installed, identically signed release app.
 * Requires the rear camera to use test-fixtures/scanner-card.png.
 */
@RunWith(AndroidJUnit4.class)
public final class ScannerReleaseSmokeTest {
    private final android.app.Instrumentation instrumentation;
    private final android.content.Context target;
    private final UiAutomation automation;

    public ScannerReleaseSmokeTest() {
        this(InstrumentationRegistry.getInstrumentation());
    }

    ScannerReleaseSmokeTest(android.app.Instrumentation instrumentation) {
        this.instrumentation = instrumentation;
        target = instrumentation.getTargetContext();
        automation = instrumentation.getUiAutomation();
    }

    @After public void finish() {
        automation.setRotation(UiAutomation.ROTATION_UNFREEZE);
    }

    @Test public void mlKitManifestRegistrarsKeepTheirReflectiveConstructors() throws Exception {
        assertRegistrarsConstructible();
    }

    @Test public void minifiedCameraReadsAnActualQrCodeAndReopensAfterRotation() throws Exception {
        assertRegistrarsConstructible();
        assertTrue("Revoke CAMERA before instrumentation so the first scan tests the real permission flow",
                target.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED);
        AccessibilityServiceInfo accessibility = automation.getServiceInfo();
        accessibility.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
        automation.setServiceInfo(accessibility);
        target.getSharedPreferences("hiciarz", 0).edit()
                .putString("language", "en").putBoolean("hideAnswers", false)
                .putString("cardSkin", "classic").putBoolean("followCardSkin", true).commit();
        shell("logcat -c");
        launch();
        waitUntil("The app must open directly in the scanner", 20_000,
                () -> containsText("Scan a card"));
        waitUntil("The scanner must offer its camera permission action", 20_000,
                () -> findAndClick(labels("Enable camera", "Włącz aparat")));
        waitUntil("Android must offer foreground camera access", 20_000,
                this::acceptAndroidCameraPermission);
        waitUntil("The camera request must grant access to the real release app", 10_000,
                () -> target.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED);
        waitUntil("ML Kit must process a real frame in the minified APK", 30_000,
                () -> readyCount() > 0);
        waitUntil("The camera must decode the fixture and show card playback", 20_000,
                () -> containsText("Scan a new card") && containsCardSkin("Disco"));
        assertTrue("Legacy answer visibility must not expose the fixture's metadata",
                !containsText("Dean Martin") && !containsText("1959") && !containsText("Reveal answer"));
        waitUntil("The skin encoded in the actual QR must replace the chosen Classic theme", 10_000,
                () -> containsCardSkin("Disco"));

        // Recreate the real release Activity and re-arm its scanner from the card.
        automation.setRotation(UiAutomation.ROTATION_FREEZE_90);
        waitUntil("The card must survive landscape recreation", 20_000,
                () -> target.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE &&
                        containsCardSkin("Disco"));
        // Return to the phone layout so this black-box test does not depend on
        // which adaptive pane owns the card actions in the short landscape window.
        automation.setRotation(UiAutomation.ROTATION_FREEZE_0);
        waitUntil("The portrait layout must be restored", 20_000,
                () -> target.getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT);
        waitUntil("Card controls must survive recreation", 20_000,
                () -> findAndClickOrScroll(labels("Scan a new card", "Skanuj nową", "Scan next card", "Next card", "Skanuj kolejną kartę", "Następna karta")));
        scrollToTop();
        waitUntil("A new camera session must process frames after rotation", 30_000,
                () -> readyCount() >= 2 && containsText("Scan a new card") && containsCardSkin("Disco"));
        assertTrue("Scanning again keeps card data hidden",
                !containsText("Dean Martin") && !containsText("1959"));
    }

    @SuppressWarnings("deprecation")
    private void assertRegistrarsConstructible() throws Exception {
        PackageInfo info = target.getPackageManager().getPackageInfo(target.getPackageName(),
                PackageManager.GET_SERVICES | PackageManager.GET_META_DATA);
        List<String> names = new ArrayList<>();
        for (ServiceInfo service : info.services == null ? new ServiceInfo[0] : info.services) {
            Bundle metadata = service.metaData;
            if (metadata == null) continue;
            for (String key : metadata.keySet()) {
                if (key.startsWith("com.google.firebase.components:") &&
                        "com.google.firebase.components.ComponentRegistrar".equals(metadata.getString(key))) {
                    names.add(key.substring("com.google.firebase.components:".length()));
                }
            }
        }
        assertTrue("ML Kit component discovery must exist in the release manifest", !names.isEmpty());
        for (String name : names) {
            // The old APK retained these classes, but R8 removed their constructors.
            Constructor<?> constructor = target.getClassLoader().loadClass(name).getDeclaredConstructor();
            assertTrue("Registrar must have a public constructor: " + name,
                    Modifier.isPublic(constructor.getModifiers()));
            constructor.newInstance();
        }
    }

    private void launch() {
        target.startActivity(new Intent().setClassName(target.getPackageName(), "pl.artifex.hiciarz.MainActivity")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
        instrumentation.waitForIdleSync();
    }

    private int readyCount() throws IOException {
        String logs = shell("logcat -d --pid=" + android.os.Process.myPid() + " -s HiciarzScanner:I");
        int count = 0;
        for (String line : logs.split("\\n")) if (line.contains("camera_ready")) count++;
        return count;
    }

    private boolean containsText(String expected) {
        return walk(automation.getRootInActiveWindow(), node ->
                node.getText() != null && node.getText().toString().contains(expected));
    }

    private boolean containsCardSkin(String expected) {
        // The card's appearance is announced to accessibility services; it is no longer
        // repeated as a separate skin-picker row in the scanning flow.
        return walk(automation.getRootInActiveWindow(), node ->
                Build.VERSION.SDK_INT >= 30 && node.getStateDescription() != null &&
                        node.getStateDescription().toString().contains(expected));
    }

    private boolean acceptAndroidCameraPermission() {
        return walk(automation.getRootInActiveWindow(), node -> {
            String resource = node.getViewIdResourceName();
            CharSequence owner = node.getPackageName();
            if (resource == null || owner == null ||
                    !(owner.toString().endsWith(".permissioncontroller") ||
                            owner.toString().endsWith(".packageinstaller"))) return false;
            if (!(resource.endsWith(":id/permission_allow_foreground_only_button") ||
                    resource.endsWith(":id/permission_allow_button"))) return false;
            return node.isClickable() && node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        });
    }

    private boolean findAndClick(Set<String> names) {
        return walk(automation.getRootInActiveWindow(), node -> {
            String text = node.getText() == null ? null : node.getText().toString();
            String description = node.getContentDescription() == null ? null : node.getContentDescription().toString();
            if (!names.contains(text) && !names.contains(description)) return false;
            AccessibilityNodeInfo clickable = node;
            while (clickable != null && !clickable.isClickable()) clickable = clickable.getParent();
            return clickable != null && clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        });
    }

    private boolean findAndClickOrScroll(Set<String> names) {
        if (findAndClick(names)) return true;
        walk(automation.getRootInActiveWindow(), node -> node.isScrollable() &&
                node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD));
        return false;
    }

    private void scrollToTop() {
        for (int attempt = 0; attempt < 8; attempt++) {
            if (!walk(automation.getRootInActiveWindow(), node -> node.isScrollable() &&
                    node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD))) return;
            SystemClock.sleep(100);
        }
    }

    private boolean walk(AccessibilityNodeInfo node, NodeMatcher match) {
        if (node == null) return false;
        if (match.test(node)) return true;
        for (int i = 0; i < node.getChildCount(); i++) if (walk(node.getChild(i), match)) return true;
        return false;
    }

    private void waitUntil(String message, long timeoutMs, Condition condition) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + timeoutMs;
        while (SystemClock.elapsedRealtime() < deadline) {
            if (condition.test()) return;
            SystemClock.sleep(120);
        }
        assertTrue(message, condition.test());
    }

    private String shell(String command) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ParcelFileDescriptor.AutoCloseInputStream(automation.executeShellCommand(command)),
                java.nio.charset.StandardCharsets.UTF_8))) {
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) output.append(line).append('\n');
            return output.toString();
        }
    }

    private static Set<String> labels(String... values) { return new HashSet<>(Arrays.asList(values)); }
    private interface NodeMatcher { boolean test(AccessibilityNodeInfo node); }
    private interface Condition { boolean test() throws Exception; }
}
