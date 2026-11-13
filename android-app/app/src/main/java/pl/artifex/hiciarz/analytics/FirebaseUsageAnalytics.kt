package pl.artifex.hiciarz.analytics

import android.content.Context
import android.os.Bundle
import com.google.firebase.FirebaseApp
import com.google.firebase.analytics.FirebaseAnalytics
import pl.artifex.hiciarz.BuildConfig

internal fun createUsageAnalytics(context: Context): UsageAnalytics {
    val app = context.applicationContext
    val preferences = app.getSharedPreferences("hiciarz_analytics_consent", Context.MODE_PRIVATE)
    val store = object : AnalyticsConsentStore {
        override fun readEnabled() = preferences.getBoolean("enabled", false)
        override fun writeEnabled(enabled: Boolean) = preferences.edit().putBoolean("enabled", enabled).commit()
    }
    return ConsentUsageAnalytics(BuildConfig.FIREBASE_ANALYTICS_CONFIGURED, store) {
        // This factory is reached only after a successful, persisted opt-in.
        // FirebaseInitProvider is removed from the merged manifest.
        checkNotNull(FirebaseApp.initializeApp(app)) { "Analytics client configuration is unavailable." }
        FirebaseAnalyticsEngine(FirebaseAnalytics.getInstance(app))
    }
}

private class FirebaseAnalyticsEngine(private val sdk: FirebaseAnalytics) : AnalyticsEngine {
    override fun setCollectionEnabled(enabled: Boolean) = sdk.setAnalyticsCollectionEnabled(enabled)

    override fun setAnalyticsConsent(granted: Boolean) {
        sdk.setConsent(firebaseConsent(granted))
    }

    override fun resetData() = sdk.resetAnalyticsData()

    override fun track(event: UsageEvent) = sdk.logEvent(event.eventName, null)

    override fun screen(screen: UsageScreen) {
        val parameters = Bundle().apply {
            putString(FirebaseAnalytics.Param.SCREEN_NAME, screen.screenName)
            putString(FirebaseAnalytics.Param.SCREEN_CLASS, "Hiciarz")
        }
        sdk.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, parameters)
    }
}

internal fun firebaseConsent(granted: Boolean) = mapOf(
    FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE to
        if (granted) FirebaseAnalytics.ConsentStatus.GRANTED else FirebaseAnalytics.ConsentStatus.DENIED,
    FirebaseAnalytics.ConsentType.AD_STORAGE to FirebaseAnalytics.ConsentStatus.DENIED,
    FirebaseAnalytics.ConsentType.AD_USER_DATA to FirebaseAnalytics.ConsentStatus.DENIED,
    FirebaseAnalytics.ConsentType.AD_PERSONALIZATION to FirebaseAnalytics.ConsentStatus.DENIED,
)
