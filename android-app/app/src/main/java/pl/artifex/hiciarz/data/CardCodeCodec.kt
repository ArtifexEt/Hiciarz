package pl.artifex.hiciarz.data

import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Base64
import org.json.JSONObject
import pl.artifex.hiciarz.model.CardSkin
import pl.artifex.hiciarz.model.Song

class CardCodeException(val code: String) : IllegalArgumentException(code)

/** Reads only the recording and optional skin carried by a QR; no library or deck is needed. */
object CardCodeCodec {
    private val trackId = Regex("[A-Za-z0-9]{22}")
    private val compact = Regex("2[cmxwfvtpd](?:s([A-Za-z0-9]{22}))?(?:y([A-Za-z0-9_-]{11}))?([mg])?")

    fun spotifyId(raw: String): String {
        val value = raw.trim()
        if (trackId.matches(value)) return value
        if (value.startsWith("spotify:track:")) {
            return value.removePrefix("spotify:track:").takeIf(trackId::matches)
                ?: throw CardCodeException("invalid_track")
        }
        val uri = runCatching { URI(value) }.getOrNull()
            ?: throw CardCodeException("invalid_track")
        if (uri.scheme != "https" || uri.host != "open.spotify.com")
            throw CardCodeException("invalid_track")
        return Regex("/(?:intl-[^/]+/)?track/([A-Za-z0-9]{22})/?")
            .matchEntire(uri.path.orEmpty())?.groupValues?.get(1)
            ?: throw CardCodeException("invalid_track")
    }

    fun readCode(raw: String): String = readCard(raw).spotifyId

    fun readCard(raw: String): Song {
        if (raw.length > 8000) throw CardCodeException("invalid_qr")
        runCatching { spotifyId(raw) }.getOrNull()?.let { return Song(it) }
        val uri = runCatching { URI(raw.trim()) }.getOrNull()
            ?: throw CardCodeException("invalid_qr")
        if (uri.scheme !in listOf("https", "http", "hiciarz"))
            throw CardCodeException("invalid_qr")
        try {
            if (uri.scheme == "hiciarz" && uri.host == "scan") {
                val values = query(uri.rawQuery.orEmpty())
                return Song(spotifyId(values["uri"] ?: throw CardCodeException("invalid_qr")))
            }
            val hash = uri.rawFragment.orEmpty()
            compact.matchEntire(hash)?.let { match ->
                val spotify = match.groupValues[1]
                if (spotify.isEmpty()) throw CardCodeException(
                    if (match.groupValues[2].isNotEmpty()) "unsupported_youtube" else "invalid_qr")
                // Older cards append a game variant. Playback needs only their recording and skin.
                return Song(spotify, CardSkin.fromCode(hash[1]))
            }
            val values = query(hash)
            if (values.containsKey("pair")) throw CardCodeException("pairing_not_supported")
            val encoded = values["card"] ?: throw CardCodeException("invalid_qr")
            if (encoded.length > 4000) throw CardCodeException("invalid_qr")
            val card = JSONObject(String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8))
            if (card.optInt("v") != 1) throw CardCodeException("invalid_qr")
            val sources = card.optJSONObject("sources") ?: throw CardCodeException("invalid_qr")
            if (sources.optString("spotify").isBlank() && sources.optString("youtube").isNotBlank())
                throw CardCodeException("unsupported_youtube")
            return Song(spotifyId(sources.getString("spotify")),
                CardSkin.fromId(card.optString("theme", "classic")) ?: CardSkin.CLASSIC)
        } catch (error: CardCodeException) { throw error }
        catch (_: Exception) { throw CardCodeException("invalid_qr") }
    }

    private fun query(value: String): Map<String, String> = value.split('&').filter { it.isNotBlank() }
        .associate { entry ->
            val parts = entry.split('=', limit = 2)
            URLDecoder.decode(parts[0], "UTF-8") to URLDecoder.decode(parts.getOrElse(1) { "" }, "UTF-8")
        }
}
