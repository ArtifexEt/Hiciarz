package pl.artifex.hiciarz

import android.content.pm.PackageManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Check the merged package, including providers and permissions added by SDKs. */
@RunWith(AndroidJUnit4::class)
class AnalyticsManifestPrivacyTest {
    @Suppress("DEPRECATION")
    @Test fun analyticsDefaultsCannotStartMeasurementOrRequestAdvertisingAccess() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val manager = context.packageManager
        val app = manager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        val defaults = listOf(
            "firebase_data_collection_default_enabled",
            "firebase_analytics_collection_enabled",
            "google_analytics_default_allow_analytics_storage",
            "google_analytics_default_allow_ad_storage",
            "google_analytics_default_allow_ad_user_data",
            "google_analytics_default_allow_ad_personalization_signals",
            "google_analytics_automatic_screen_reporting_enabled",
            "google_analytics_adid_collection_enabled",
            "google_analytics_ssaid_collection_enabled",
        )
        defaults.forEach { key ->
            assertTrue("Missing privacy default: $key", app.metaData.containsKey(key))
            assertFalse("Privacy default must remain disabled: $key", app.metaData.getBoolean(key))
        }
        val installed = manager.getPackageInfo(context.packageName,
            PackageManager.GET_PERMISSIONS or PackageManager.GET_PROVIDERS)
        assertFalse(installed.providers.orEmpty().any {
            it.name == "com.google.firebase.provider.FirebaseInitProvider"
        })
        val advertisingPermissions = setOf(
            "com.google.android.gms.permission.AD_ID",
            "android.permission.ACCESS_ADSERVICES_AD_ID",
            "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
            "android.permission.ACCESS_ADSERVICES_TOPICS",
        )
        assertFalse(installed.requestedPermissions.orEmpty().any { it in advertisingPermissions })
    }
}
