package pl.artifex.hiciarz

import android.app.Application
import pl.artifex.hiciarz.analytics.UsageAnalytics
import pl.artifex.hiciarz.analytics.createUsageAnalytics

class HiciarzApplication : Application() {
    /** Reading preferences is safe; the SDK factory remains gated by consent. */
    val analytics: UsageAnalytics by lazy { createUsageAnalytics(this) }
}
