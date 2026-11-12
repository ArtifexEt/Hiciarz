package pl.artifex.hiciarz.data

import java.nio.charset.StandardCharsets
import java.util.Base64
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import pl.artifex.hiciarz.model.CardSkin
import pl.artifex.hiciarz.model.Song

class CardCodeCodecTest {
    private val recording = "2FRnf9qhLbvw8fu4IBXx78"

    @Test fun `all printed skins and legacy game variants play without a deck`() {
        CardSkin.entries.forEach { skin ->
            for (suffix in listOf("", "m", "g")) {
                assertEquals(Song(recording, skin),
                    CardCodeCodec.readCard("https://example.org/#2${skin.code}s$recording$suffix"))
            }
            for (variant in listOf("music", "game", "movie", "CLASSIC", "GAME", "MOVIE")) {
                assertEquals(Song(recording, skin), CardCodeCodec.readCard(legacyCard(
                    JSONObject().put("spotify", recording), variant, skin.id)))
            }
        }
    }

    @Test fun `compact cards support both sources while selecting Spotify`() {
        val codes = listOf(
            "https://artifexet.github.io/Hiciarz/#2fs$recording",
            "https://example.org/cards/#2fs${recording}yE8gmARGvPlI",
            "https://example.org/cards/#2ts${recording}yE8gmARGvPlIg",
            "https://example.org/cards/#2cs${recording}m",
        )
        codes.forEach { assertEquals(it, recording, CardCodeCodec.readCode(it)) }
    }

    @Test fun `normalizes IDs Spotify links URIs and Android deep links`() {
        val sources = listOf(
            " $recording ",
            "spotify:track:$recording",
            "https://open.spotify.com/track/$recording?si=share&utm_source=copy-link",
            "https://open.spotify.com/intl-pl/track/$recording/",
        )
        sources.forEach {
            assertEquals(it, recording, CardCodeCodec.spotifyId(it))
            assertEquals(it, Song(recording), CardCodeCodec.readCard(it))
        }
        assertEquals(Song(recording), CardCodeCodec.readCard(
            "hiciarz://scan?uri=spotify%3Atrack%3A$recording"))
    }

    @Test fun `previously printed version one card still plays`() {
        val old = "https://artifexet.github.io/Hiciarz/#card=" +
            "eyJ2IjoxLCJpZCI6ImNocmlzdG1hcy0yRWpYZkg5MW03ZjhIaUpOMXlRZzk3IiwidGhlbWUiOiJmaXNoIiwic291cmNlcyI6eyJzcG90aWZ5IjoiMkVqWGZIOTFtN2Y4SGlKTjF5UWc5NyJ9fQ"
        assertEquals(Song("2EjXfH91m7f8HiJN1yQg97", CardSkin.FISH), CardCodeCodec.readCard(old))
    }

    @Test fun `legacy UTF8 cards ignore answer metadata and retain their recording and skin`() {
        val data = JSONObject().put("v", 1).put("id", "karta-żółć-🎮")
            .put("title", "A printed title").put("artist", "Printed artist")
            .put("year", 1984).put("answer", "Printed answer").put("gameMode", "game")
            .put("theme", "mixtape").put("sources", JSONObject()
                .put("spotify", "spotify:track:$recording").put("youtube", "E8gmARGvPlI"))
        assertEquals(Song(recording, CardSkin.MIXTAPE), CardCodeCodec.readCard(encoded(data)))
    }

    @Test fun `unknown legacy skin falls back to classic`() {
        assertEquals(Song(recording, CardSkin.CLASSIC), CardCodeCodec.readCard(
            legacyCard(JSONObject().put("spotify", recording), skin = "future-skin")))
    }

    @Test fun `rejects Spotify lookalike hosts wrong resources and prefix matches`() {
        val sources = listOf(
            "https://open.spotify.com.evil.example/track/$recording",
            "https://open.spotify.com@evil.example/track/$recording",
            "https://evil.example/open.spotify.com/track/$recording",
            "https://open.spotify.com/not-a-track/track/$recording",
            "https://open.spotify.com/playlist/$recording",
            "http://open.spotify.com/track/$recording",
            "spotify:track:$recording:unexpected",
            "https://open.spotify.com/track/${recording}extra",
        )
        sources.forEach { source ->
            assertCode("invalid_track") { CardCodeCodec.spotifyId(source) }
            assertCode("invalid_qr") { CardCodeCodec.readCode(source) }
        }
    }

    @Test fun `distinguishes unsupported YouTube and web pairing codes`() {
        assertCode("unsupported_youtube") { CardCodeCodec.readCode("https://example.org/#2fyE8gmARGvPlIg") }
        assertCode("unsupported_youtube") {
            CardCodeCodec.readCode(legacyCard(JSONObject().put("youtube", "E8gmARGvPlI")))
        }
        assertCode("pairing_not_supported") {
            CardCodeCodec.readCode("https://example.org/#pair=host-phone&token=0123456789abcdef0123456789abcdef")
        }
    }

    @Test fun `damaged or oversized codes and deck files never become guessed tracks`() {
        val fragments = listOf(
            "2fsabc", "2zsyoutube", "3fs$recording", "2f",
            "2fyE8gmARGvPlIs$recording", "2fs${recording}gg",
            "card=not-base64!", "card=eyJ2IjozfQ", "card=%ZZ",
        )
        fragments.forEach { assertCode("invalid_qr") { CardCodeCodec.readCode("https://example.org/#$it") } }
        for (raw in listOf("javascript:alert(1)", "a".repeat(8001),
            "{\"version\":1,\"songs\":[]}", "hiciarz://scan?uri=%ZZ")) {
            assertCode("invalid_qr") { CardCodeCodec.readCode(raw) }
        }
    }

    private fun legacyCard(sources: JSONObject, variant: String = "music", skin: String = "fish") =
        encoded(JSONObject().put("v", 1).put("sources", sources).put("gameMode", variant).put("theme", skin))

    private fun encoded(value: JSONObject) = "https://example.org/#card=" +
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.toString().toByteArray(StandardCharsets.UTF_8))

    private fun assertCode(code: String, action: () -> Unit) {
        assertEquals(code, assertThrows(CardCodeException::class.java) { action() }.code)
    }
}
