package pl.artifex.hiciarz.analytics

import com.google.firebase.analytics.FirebaseAnalytics.ConsentStatus
import com.google.firebase.analytics.FirebaseAnalytics.ConsentType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UsageAnalyticsTest {
    @Test fun `no decision does not initialize SDK or queue events`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        UsageEvent.entries.forEach(analytics::track)
        UsageScreen.entries.forEach(analytics::screen)
        assertFalse(analytics.enabled.value)
        assertEquals(emptyList<String>(), fixture.operations)
        analytics.setEnabled(true)
        assertEquals(emptyList<UsageEvent>(), fixture.engine.events)
        assertEquals(emptyList<UsageScreen>(), fixture.engine.screens)
    }

    @Test fun `grant is persisted before SDK creation and collection follows consent`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        analytics.setEnabled(true)
        assertTrue(analytics.enabled.value)
        assertEquals(listOf("store:true", "create", "collection:false", "consent:true", "collection:true"),
            fixture.operations)
        analytics.setEnabled(true)
        assertEquals(1, fixture.operations.count { it == "create" })
        analytics.track(UsageEvent.SCAN_ACCEPTED)
        assertEquals(listOf(UsageEvent.SCAN_ACCEPTED), fixture.engine.events)
    }

    @Test fun `saved grant is restored but denial survives restart`() {
        val fixture = Fixture(saved = true)
        val analytics = fixture.create()
        assertTrue(analytics.enabled.value)
        assertEquals(listOf("create", "collection:false", "consent:true", "collection:true"), fixture.operations)
        analytics.setEnabled(false)
        assertFalse(fixture.saved)
        assertFalse(analytics.enabled.value)
        fixture.operations.clear()
        assertFalse(fixture.create().enabled.value)
        assertTrue(fixture.operations.isEmpty())
    }

    @Test fun `revocation closes gate disables collection denies consent and resets local data`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        analytics.setEnabled(true)
        fixture.operations.clear()
        analytics.setEnabled(false)
        assertEquals(listOf("store:false", "collection:false", "consent:false", "reset"), fixture.operations)
        analytics.track(UsageEvent.PLAYBACK_STARTED)
        analytics.screen(UsageScreen.SCANNER)
        assertTrue(fixture.engine.events.isEmpty())
        assertTrue(fixture.engine.screens.isEmpty())
        assertFalse(analytics.enabled.value)
    }

    @Test fun `screen events ignore recomposition repeats and preconsent screens`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        analytics.screen(UsageScreen.SCANNER)
        analytics.setEnabled(true)
        analytics.screen(UsageScreen.SCANNER)
        analytics.screen(UsageScreen.SCANNER)
        analytics.screen(UsageScreen.SETTINGS)
        analytics.screen(UsageScreen.SCANNER)
        assertEquals(listOf(UsageScreen.SCANNER, UsageScreen.SETTINGS, UsageScreen.SCANNER), fixture.engine.screens)
        analytics.setEnabled(false)
        analytics.screen(UsageScreen.SETTINGS)
        analytics.setEnabled(true)
        analytics.screen(UsageScreen.SCANNER)
        assertEquals(UsageScreen.SCANNER, fixture.engine.screens.last())
        assertEquals(4, fixture.engine.screens.size)
    }

    @Test fun `unconfigured clone cannot enable measurement even with old preference`() {
        val fixture = Fixture(saved = true)
        val analytics = fixture.create(configured = false)
        analytics.setEnabled(true)
        analytics.track(UsageEvent.SCAN_ACCEPTED)
        assertFalse(analytics.configured)
        assertFalse(analytics.enabled.value)
        assertTrue(fixture.operations.isEmpty())
        NoOpUsageAnalytics.setEnabled(true)
        assertFalse(NoOpUsageAnalytics.enabled.value)
    }

    @Test fun `failed grant persistence does not initialize SDK`() {
        val fixture = Fixture().apply { writeFails = true }
        val analytics = fixture.create()
        analytics.setEnabled(true)
        assertFalse(analytics.enabled.value)
        assertTrue(analytics.saveFailed.value)
        assertEquals(listOf("store:true"), fixture.operations)
    }

    @Test fun `corrupt or unreadable preference defaults to disabled`() {
        val fixture = Fixture(saved = true).apply { readFails = true }
        assertFalse(fixture.create().enabled.value)
        assertTrue(fixture.operations.isEmpty())
    }

    @Test fun `preference write exception is exposed without initializing SDK`() {
        val fixture = Fixture().apply { throwOnWrite = true }
        val analytics = fixture.create()
        analytics.setEnabled(true)
        assertTrue(analytics.saveFailed.value)
        assertFalse(analytics.enabled.value)
        assertEquals(listOf("store:true"), fixture.operations)
    }

    @Test fun `failed SDK initialization does not leave consent enabled or escape`() {
        val fixture = Fixture().apply { factoryFails = true }
        val analytics = fixture.create()
        analytics.setEnabled(true)
        assertFalse(analytics.enabled.value)
        assertFalse(fixture.saved)
        assertEquals(listOf("store:true", "create", "store:false"), fixture.operations)
    }

    @Test fun `SDK failure during revocation still attempts all privacy operations`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        analytics.setEnabled(true)
        fixture.operations.clear()
        fixture.engine.failDisable = true
        analytics.setEnabled(false)
        assertFalse(analytics.enabled.value)
        assertEquals(listOf("store:false", "collection:false", "consent:false", "reset"), fixture.operations)
    }

    @Test fun `preference write failure cannot leave current process measuring after revocation`() {
        val fixture = Fixture()
        val analytics = fixture.create()
        analytics.setEnabled(true)
        fixture.writeFails = true
        analytics.setEnabled(false)
        assertFalse(analytics.enabled.value)
        assertTrue(analytics.saveFailed.value)
        assertTrue(fixture.operations.takeLast(3) == listOf("collection:false", "consent:false", "reset"))
        // Failure is exposed honestly: disk still contains the previous grant.
        assertTrue(fixture.saved)
        fixture.writeFails = false
        analytics.setEnabled(false)
        assertFalse(analytics.saveFailed.value)
        assertFalse(fixture.saved)
        assertFalse(fixture.create().enabled.value)
    }

    @Test fun `advertising permissions are denied for both choices`() {
        for (grant in listOf(false, true)) {
            val consent = firebaseConsent(grant)
            assertEquals(4, consent.size)
            assertEquals(if (grant) ConsentStatus.GRANTED else ConsentStatus.DENIED, consent[ConsentType.ANALYTICS_STORAGE])
            listOf(ConsentType.AD_STORAGE, ConsentType.AD_USER_DATA, ConsentType.AD_PERSONALIZATION).forEach {
                assertEquals(ConsentStatus.DENIED, consent[it])
            }
        }
    }

    private class Fixture(var saved: Boolean = false) : AnalyticsConsentStore {
        val operations = mutableListOf<String>()
        val engine = FakeEngine(operations)
        var writeFails = false
        var readFails = false
        var factoryFails = false
        var throwOnWrite = false
        override fun readEnabled(): Boolean {
            check(!readFails)
            return saved
        }
        override fun writeEnabled(enabled: Boolean): Boolean {
            operations += "store:$enabled"
            check(!throwOnWrite)
            if (writeFails) return false
            saved = enabled
            return true
        }
        fun create(configured: Boolean = true) = ConsentUsageAnalytics(configured, this) {
            operations += "create"
            check(!factoryFails)
            engine
        }
    }

    private class FakeEngine(private val operations: MutableList<String>) : AnalyticsEngine {
        val events = mutableListOf<UsageEvent>()
        val screens = mutableListOf<UsageScreen>()
        var failDisable = false
        override fun setCollectionEnabled(enabled: Boolean) {
            operations += "collection:$enabled"
            check(enabled || !failDisable)
        }
        override fun setAnalyticsConsent(granted: Boolean) { operations += "consent:$granted" }
        override fun resetData() { operations += "reset" }
        override fun track(event: UsageEvent) { events += event }
        override fun screen(screen: UsageScreen) { screens += screen }
    }
}
