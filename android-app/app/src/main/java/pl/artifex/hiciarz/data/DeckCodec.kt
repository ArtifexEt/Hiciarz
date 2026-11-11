package pl.artifex.hiciarz.data

import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Base64
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject
import pl.artifex.hiciarz.model.Deck
import pl.artifex.hiciarz.model.GameMode
import pl.artifex.hiciarz.model.Song

class DeckFormatException(val code: String) : IllegalArgumentException(code)

/** Printed cards identify their variant; a direct Spotify link carries only a recording. */
data class ScannedCard(val spotifyId: String, val gameMode: GameMode? = null)

/** The same version-1 deck files and compact card codes as the web creator. */
object DeckCodec {
    private val trackId = Regex("[A-Za-z0-9]{22}")
    private val compact = Regex("2[cmxwfvtpd](?:s([A-Za-z0-9]{22}))?(?:y([\\w-]{11}))?([mg])?")
    const val MAX_BYTES = 4 * 1024 * 1024

    fun spotifyId(raw: String): String {
        val value = raw.trim()
        if (trackId.matches(value)) return value
        if (value.startsWith("spotify:track:")) {
            return value.removePrefix("spotify:track:").takeIf(trackId::matches)
                ?: throw DeckFormatException("invalid_track")
        }
        val uri = runCatching { URI(value) }.getOrNull()
            ?: throw DeckFormatException("invalid_track")
        if (uri.scheme != "https" || uri.host != "open.spotify.com")
            throw DeckFormatException("invalid_track")
        return Regex("/(?:intl-[^/]+/)?track/([A-Za-z0-9]{22})/?")
            .matchEntire(uri.path.orEmpty())?.groupValues?.get(1)
            ?: throw DeckFormatException("invalid_track")
    }

    fun readCode(raw: String): String = readCard(raw).spotifyId

    fun readCard(raw: String): ScannedCard {
        if (raw.length > 8000) throw DeckFormatException("invalid_qr")
        runCatching { spotifyId(raw) }.getOrNull()?.let { return ScannedCard(it) }
        val uri = runCatching { URI(raw.trim()) }.getOrNull()
            ?: throw DeckFormatException("invalid_qr")
        if (uri.scheme !in listOf("https", "http", "hiciarz"))
            throw DeckFormatException("invalid_qr")
        if (uri.scheme == "hiciarz" && uri.host == "scan") {
            val query = query(uri.rawQuery.orEmpty())
            return ScannedCard(spotifyId(query["uri"] ?: throw DeckFormatException("invalid_qr")))
        }
        val hash = uri.rawFragment.orEmpty()
        compact.matchEntire(hash)?.let { match ->
            val spotify = match.groupValues[1]
            if (spotify.isEmpty()) throw DeckFormatException(
                if (match.groupValues[2].isNotEmpty()) "unsupported_youtube" else "invalid_qr")
            val gameMode = when (match.groupValues[3]) {
                "m" -> GameMode.MOVIE
                "g" -> GameMode.GAME
                else -> GameMode.CLASSIC
            }
            return ScannedCard(spotify, gameMode)
        }
        val values = query(hash)
        if (values.containsKey("pair")) throw DeckFormatException("pairing_not_supported")
        val encoded = values["card"] ?: throw DeckFormatException("invalid_qr")
        if (encoded.length > 4000) throw DeckFormatException("invalid_qr")
        return try {
            val card = JSONObject(String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8))
            if (card.optInt("v") != 1) throw DeckFormatException("invalid_qr")
            val sources = card.optJSONObject("sources") ?: throw DeckFormatException("invalid_qr")
            if (sources.optString("spotify").isBlank() && sources.optString("youtube").isNotBlank())
                throw DeckFormatException("unsupported_youtube")
            ScannedCard(spotifyId(sources.getString("spotify")), mode(card.optString("gameMode", "music")))
        } catch (error: DeckFormatException) { throw error }
        catch (_: Exception) { throw DeckFormatException("invalid_qr") }
    }

    private fun query(value: String): Map<String, String> = value.split('&').filter { it.isNotBlank() }
        .associate { entry ->
            val parts = entry.split('=', limit = 2)
            URLDecoder.decode(parts[0], "UTF-8") to URLDecoder.decode(parts.getOrElse(1) { "" }, "UTF-8")
        }

    fun parse(text: String, filename: String, bundled: Boolean = false): Deck {
        if (text.toByteArray(StandardCharsets.UTF_8).size > MAX_BYTES)
            throw DeckFormatException("import_too_large")
        try {
            if (filename.endsWith(".csv", ignoreCase = true)) return parseCsv(text, filename)
            val trimmed = text.trim().removePrefix("\uFEFF")
            val objectDeck = if (trimmed.startsWith("[")) JSONObject()
                .put("version", 1).put("name", filename.substringBeforeLast('.'))
                .put("songs", JSONArray(trimmed)) else JSONObject(trimmed)
            if (objectDeck.optInt("version") != 1) throw DeckFormatException("invalid_deck")
            val mode = mode(objectDeck.optString("gameMode", "music"))
            val rows = objectDeck.getJSONArray("songs")
            if (rows.length() > 2000) throw DeckFormatException("import_too_large")
            val songs = (0 until rows.length()).mapNotNull { parseSong(rows.getJSONObject(it), mode) }
            if (songs.isEmpty()) throw DeckFormatException(if (rows.length() > 0) "unsupported_youtube" else "empty_deck")
            if (songs.map { it.id }.distinct().size != songs.size) throw DeckFormatException("invalid_deck")
            return Deck(
                id = objectDeck.optString("id").takeIf { it.isNotBlank() && it.length <= 100 }
                    ?: UUID.randomUUID().toString(),
                name = objectDeck.optString("name").trim().takeIf { it.isNotEmpty() && it.length <= 200 }
                    ?: filename.substringBeforeLast('.').take(200),
                songs = songs.distinctBy { it.spotifyId to it.gameMode },
                gameMode = mode,
                bundled = bundled,
            )
        } catch (error: DeckFormatException) { throw error }
        catch (_: Exception) { throw DeckFormatException("invalid_deck") }
    }

    private fun parseSong(row: JSONObject, fallback: GameMode): Song? {
        val sources = row.optJSONObject("sources") ?: row
        val rawId = sources.optString("spotify").trim()
        if (rawId.isEmpty() && sources.optString("youtube").isNotBlank()) return null
        val spotify = spotifyId(rawId)
        val title = row.optString("title").trim()
        val artist = row.optString("artist").trim()
        val year = row.optInt("year", -1)
        val mode = if (row.has("gameMode")) mode(row.optString("gameMode")) else fallback
        val answer = row.optString("answer").trim()
        if (title.isEmpty() || artist.isEmpty() || title.length > 200 || artist.length > 200 || year !in 1000..2100)
            throw DeckFormatException("invalid_deck")
        if (answer.length > 200 || (mode != GameMode.CLASSIC && answer.isEmpty()))
            throw DeckFormatException("invalid_deck")
        return Song(row.optString("id").takeIf { it.isNotBlank() && it.length <= 100 }
            ?: "spotify-$spotify", title, artist, year, spotify, answer, mode)
    }

    private fun mode(raw: String) = when (raw) {
        "music", "", "CLASSIC" -> GameMode.CLASSIC
        "game", "GAME" -> GameMode.GAME
        "movie", "MOVIE" -> GameMode.MOVIE
        else -> throw DeckFormatException("invalid_deck")
    }

    fun encode(deck: Deck): String = JSONObject().put("version", 1).put("id", deck.id)
        .put("name", deck.name).put("gameMode", modeName(deck.gameMode))
        .put("songs", JSONArray(deck.songs.map { song -> JSONObject().put("id", song.id)
            .put("title", song.title).put("artist", song.artist).put("year", song.year)
            .put("gameMode", modeName(song.gameMode)).put("answer", song.answer)
            .put("sources", JSONObject().put("spotify", song.spotifyId)) })).toString()

    private fun modeName(mode: GameMode) = when (mode) {
        GameMode.CLASSIC -> "music"; GameMode.GAME -> "game"; GameMode.MOVIE -> "movie"
    }

    /** RFC4180: quoted commas, escaped quotes and multiline cells are preserved. */
    private fun parseCsv(text: String, filename: String): Deck {
        val rows = mutableListOf<List<String>>()
        var row = mutableListOf<String>()
        val cell = StringBuilder()
        var quoted = false
        var index = 0
        val input = text.removePrefix("\uFEFF")
        while (index < input.length) {
            val char = input[index]
            when {
                char == '"' && quoted && input.getOrNull(index + 1) == '"' -> { cell.append('"'); index++ }
                char == '"' -> { if (!quoted && cell.isNotEmpty()) throw DeckFormatException("invalid_deck"); quoted = !quoted }
                char == ',' && !quoted -> { row.add(cell.toString()); cell.clear() }
                (char == '\n' || char == '\r') && !quoted -> {
                    row.add(cell.toString()); cell.clear()
                    if (row.any { it.isNotBlank() }) rows.add(row)
                    row = mutableListOf()
                    if (char == '\r' && input.getOrNull(index + 1) == '\n') index++
                }
                else -> cell.append(char)
            }
            index++
        }
        if (quoted) throw DeckFormatException("invalid_deck")
        row.add(cell.toString())
        if (row.any { it.isNotBlank() }) rows.add(row)
        if (rows.size < 2) throw DeckFormatException("empty_deck")
        val headers = rows.first().map { it.trim() }
        if (!headers.containsAll(listOf("title", "artist", "year", "spotify")))
            throw DeckFormatException("invalid_deck")
        val data = JSONArray()
        rows.drop(1).forEach { cells ->
            if (cells.size != headers.size) throw DeckFormatException("invalid_deck")
            val song = JSONObject()
            headers.zip(cells).forEach { (key, value) -> song.put(key, value) }
            data.put(song)
        }
        return parse(JSONObject().put("version", 1).put("name", filename.substringBeforeLast('.'))
            .put("songs", data).toString(), "import.json")
    }
}
