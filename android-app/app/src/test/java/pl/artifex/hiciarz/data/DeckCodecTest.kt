package pl.artifex.hiciarz.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import pl.artifex.hiciarz.model.Deck
import pl.artifex.hiciarz.model.GameMode
import pl.artifex.hiciarz.model.Song

class DeckCodecTest {
    private val christmas = "2FRnf9qhLbvw8fu4IBXx78"
    private val dancingQueen = "0GjEhVFGZW8afUYGChu3Rr"

    @Test
    fun `reads compact cards printed by the web creator including both sources and game suffixes`() {
        // The web demo's second card: cardUrl(song, "fish", base).
        val cards = listOf(
            "https://artifexet.github.io/Hiciarz/#2fs2FRnf9qhLbvw8fu4IBXx78",
            "https://example.org/cards/#2fs2FRnf9qhLbvw8fu4IBXx78yE8gmARGvPlI",
            "https://example.org/cards/#2ts2FRnf9qhLbvw8fu4IBXx78yE8gmARGvPlIg",
            "https://example.org/cards/#2cs2FRnf9qhLbvw8fu4IBXx78m",
        )

        cards.forEach { assertEquals(it, christmas, DeckCodec.readCode(it)) }
    }

    @Test
    fun `keeps a printed card variant distinct from another card with the same recording`() {
        val normal = DeckCodec.readCard("https://example.org/#2fs$christmas")
        val movie = DeckCodec.readCard("https://example.org/#2fs${christmas}m")
        val game = DeckCodec.readCard("https://example.org/#2fs${christmas}yE8gmARGvPlIg")

        assertEquals(ScannedCard(christmas, GameMode.CLASSIC), normal)
        assertEquals(ScannedCard(christmas, GameMode.MOVIE), movie)
        assertEquals(ScannedCard(christmas, GameMode.GAME), game)
        assertEquals(3, setOf(normal, movie, game).size)
        assertEquals(listOf(christmas), listOf(normal, movie, game).map { it.spotifyId }.distinct())
    }

    @Test
    fun `preserves explicit legacy variants and defaults older printed cards to classic`() {
        for ((rawMode, expected) in listOf(
            null to GameMode.CLASSIC,
            "music" to GameMode.CLASSIC,
            "movie" to GameMode.MOVIE,
            "game" to GameMode.GAME,
            "CLASSIC" to GameMode.CLASSIC,
            "MOVIE" to GameMode.MOVIE,
            "GAME" to GameMode.GAME,
        )) {
            val code = legacyCard(JSONObject().put("spotify", "spotify:track:$christmas"), rawMode)

            assertEquals(rawMode, ScannedCard(christmas, expected), DeckCodec.readCard(code))
            assertEquals(christmas, DeckCodec.readCode(code))
        }
    }

    @Test
    fun `leaves the variant unspecified for Spotify links and Android deep links`() {
        val links = listOf(
            " $christmas ",
            "spotify:track:$christmas",
            "https://open.spotify.com/track/$christmas?si=share",
            "https://open.spotify.com/intl-pl/track/$christmas/",
            "hiciarz://scan?uri=spotify%3Atrack%3A$christmas",
        )

        links.forEach { assertEquals(it, ScannedCard(christmas), DeckCodec.readCard(it)) }
    }

    @Test
    fun `keeps previously printed version one card codes usable`() {
        // Historical fixture also retained by web/src/model.test.ts.
        val old = "https://artifexet.github.io/Hiciarz/#card=" +
            "eyJ2IjoxLCJpZCI6ImNocmlzdG1hcy0yRWpYZkg5MW03ZjhIaUpOMXlRZzk3IiwidGhlbWUiOiJmaXNoIiwic291cmNlcyI6eyJzcG90aWZ5IjoiMkVqWGZIOTFtN2Y4SGlKTjF5UWc5NyJ9fQ"

        assertEquals("2EjXfH91m7f8HiJN1yQg97", DeckCodec.readCode(old))
        assertEquals(GameMode.CLASSIC, DeckCodec.readCard(old).gameMode)
    }

    @Test
    fun `decodes unpadded UTF8 legacy cards containing a Spotify URI`() {
        // UTF-8 JSON with id "karta-żółć-🎮", gameMode=game and two sources.
        val code = "https://example.org/Hiciarz/#card=" +
            "eyJ2IjoxLCJpZCI6ImthcnRhLcW8w7PFgsSHLfCfjq4iLCJ0aGVtZSI6Im1peHRhcGUiLCJnYW1lTW9kZSI6ImdhbWUiLCJzb3VyY2VzIjp7InNwb3RpZnkiOiJzcG90aWZ5OnRyYWNrOjJGUm5mOXFoTGJ2dzhmdTRJQlh4NzgiLCJ5b3V0dWJlIjoiRThnbUFSR3ZQbEkifX0"

        assertEquals(christmas, DeckCodec.readCode(code))
        assertEquals(ScannedCard(christmas, GameMode.GAME), DeckCodec.readCard(code))
    }

    @Test
    fun `normalizes Spotify links URIs and Android deep links to the same track`() {
        val sources = listOf(
            " $christmas ",
            "spotify:track:$christmas",
            "https://open.spotify.com/track/$christmas?si=share&utm_source=copy-link",
            "https://open.spotify.com/intl-pl/track/$christmas/",
        )

        sources.forEach {
            assertEquals(it, christmas, DeckCodec.spotifyId(it))
            assertEquals(it, christmas, DeckCodec.readCode(it))
        }
        assertEquals(christmas, DeckCodec.readCode(
            "hiciarz://scan?uri=spotify%3Atrack%3A$christmas",
        ))
    }

    @Test
    fun `rejects Spotify lookalike hosts wrong resource types and prefix matches`() {
        val sources = listOf(
            "https://open.spotify.com.evil.example/track/$christmas",
            "https://open.spotify.com@evil.example/track/$christmas",
            "https://evil.example/open.spotify.com/track/$christmas",
            "https://open.spotify.com/not-a-track/track/$christmas",
            "https://open.spotify.com/playlist/$christmas",
            "http://open.spotify.com/track/$christmas",
            "spotify:track:$christmas:unexpected",
            "https://open.spotify.com/track/${christmas}extra",
        )

        sources.forEach { source ->
            assertCode("invalid_track") { DeckCodec.spotifyId(source) }
            assertCode("invalid_qr") { DeckCodec.readCode(source) }
        }
    }

    @Test
    fun `distinguishes unsupported YouTube and pairing codes from broken card codes`() {
        assertCode("unsupported_youtube") {
            DeckCodec.readCode("https://example.org/#2fyE8gmARGvPlIg")
        }
        assertCode("unsupported_youtube") {
            DeckCodec.readCode(legacyCard(JSONObject().put("youtube", "E8gmARGvPlI")))
        }
        assertCode("pairing_not_supported") {
            DeckCodec.readCode("https://example.org/#pair=host-phone&token=0123456789abcdef0123456789abcdef")
        }
    }

    @Test
    fun `rejects damaged compact codes instead of guessing a source`() {
        val fragments = listOf(
            "2fsabc", "2zsyoutube", "3fs$christmas", "2f",
            "2fyE8gmARGvPlIs$christmas", "2fs${christmas}gg",
            "card=not-base64!", "card=eyJ2IjozfQ",
        )
        fragments.forEach { fragment ->
            assertCode("invalid_qr") { DeckCodec.readCode("https://example.org/#$fragment") }
        }
        assertCode("invalid_qr") { DeckCodec.readCode("javascript:alert(1)") }
    }

    @Test
    fun `imports a web game project while ignoring its print-only settings`() {
        val webProject = """
            {
              "version": 1, "id": "example-game-originals",
              "name": "Zgadnij grę — oryginalne nagrania", "theme": "mixtape", "gameMode": "game",
              "print": {"style":"theme","frontColors":"varied","edge":"long","cuts":true},
              "songs": [{
                "id":"game-original-09VaRXynySDWbahfxioD14", "title":"Rip & Tear",
                "artist":"Mick Gordon", "year":2016, "gameMode":"game", "answer":"DOOM (2016)",
                "sources":{"spotify":"09VaRXynySDWbahfxioD14"}, "review":true
              }]
            }
        """.trimIndent()

        val deck = DeckCodec.parse(webProject, "game-originals.json", bundled = true)

        assertEquals("example-game-originals", deck.id)
        assertEquals(GameMode.GAME, deck.gameMode)
        assertEquals("DOOM (2016)", deck.songs.single().answer)
        assertEquals(GameMode.GAME, deck.songs.single().gameMode)
        assertEquals("spotify:track:09VaRXynySDWbahfxioD14", deck.songs.single().spotifyUri)
        assertEquals(true, deck.bundled)
    }

    @Test
    fun `reads CSV exported by web with BOM quoted commas line breaks and escaped quotes`() {
        val csv = "\uFEFFid,title,artist,year,gameMode,answer,theme,spotify,youtube\r\n" +
            "game-1,\"Żółć, \"\"piosenka\"\"\nczęść 2\",\"Earth, Wind & Fire\",1994,game," +
            "\"Gra, \"\"edycja II\"\"\",mixtape,$christmas,E8gmARGvPlI\r\n"

        val song = DeckCodec.parse(csv, "Muzyka.CSV").songs.single()

        assertEquals("Żółć, \"piosenka\"\nczęść 2", song.title)
        assertEquals("Earth, Wind & Fire", song.artist)
        assertEquals("Gra, \"edycja II\"", song.answer)
        assertEquals(GameMode.GAME, song.gameMode)
        assertEquals(christmas, song.spotifyId)
        assertEquals(1994, song.year)
    }

    @Test
    fun `rejects truncated CSV instead of shifting columns silently`() {
        val header = "title,artist,year,spotify\n"
        assertCode("invalid_deck") {
            DeckCodec.parse(header + "\"Unclosed title,Artist,1999,$christmas", "bad.csv")
        }
        assertCode("invalid_deck") {
            DeckCodec.parse(header + "Song,Artist,1999,$christmas,extra", "bad.csv")
        }
    }

    @Test
    fun `requires the answer for movie and game imports including a deck-level mode`() {
        for (mode in listOf("game", "movie")) {
            val perSong = jsonSong("one", christmas).put("gameMode", mode).put("answer", "  ")
            assertCode("invalid_deck") { DeckCodec.parse(jsonDeck(perSong).toString(), "bad.json") }

            val inherited = jsonDeck(jsonSong("one", christmas)).put("gameMode", mode)
            assertCode("invalid_deck") { DeckCodec.parse(inherited.toString(), "bad.json") }

            inherited.getJSONArray("songs").getJSONObject(0).put("answer", "  Wiedźmin 3  ")
            val imported = DeckCodec.parse(inherited.toString(), "game.json").songs.single()
            assertEquals("Wiedźmin 3", imported.answer)
            assertEquals(if (mode == "game") GameMode.GAME else GameMode.MOVIE, imported.gameMode)
        }
    }

    @Test
    fun `round trips local game data through portable version-one JSON`() {
        val deck = Deck("deck-1", "Żółć i 🎮", listOf(
            Song("song-1", "Tytuł, \"część 2\"\nEncore", "Łąki Łan", 2015, christmas),
            Song("song-2", "Main Theme", "Kompozytor", 1999, dancingQueen, "Baldur’s Gate", GameMode.GAME),
        ), GameMode.GAME)

        val encoded = DeckCodec.encode(deck)
        val portable = JSONObject(encoded)

        assertEquals(1, portable.getInt("version"))
        assertEquals("game", portable.getString("gameMode"))
        assertEquals("music", portable.getJSONArray("songs").getJSONObject(0).getString("gameMode"))
        assertEquals(deck, DeckCodec.parse(encoded, "export.json"))
    }

    @Test
    fun `rejects duplicate record identifiers even if the tracks differ`() {
        val deck = jsonDeck(jsonSong("same-id", christmas), jsonSong("same-id", dancingQueen))

        assertCode("invalid_deck") { DeckCodec.parse(deck.toString(), "duplicate.json") }
    }

    @Test
    fun `deduplicates normalized tracks while preserving the first imported answer`() {
        val first = jsonSong("first", christmas).put("title", "Poprawiony tytuł")
        val second = jsonSong("second", "https://open.spotify.com/track/$christmas?si=copy")

        val imported = DeckCodec.parse(jsonDeck(first, second).toString(), "songs.json")

        assertEquals(1, imported.songs.size)
        assertEquals("first", imported.songs.single().id)
        assertEquals("Poprawiony tytuł", imported.songs.single().title)
    }

    @Test
    fun `preserves different card variants of the same recording inside a mixed deck`() {
        val classic = jsonSong("music-card", christmas)
        val game = jsonSong("game-card", christmas).put("gameMode", "game").put("answer", "Wiedźmin 3")
        val movie = jsonSong("movie-card", christmas).put("gameMode", "movie").put("answer", "Tron")
        val repeatedGame = jsonSong("repeated-game", christmas).put("gameMode", "game").put("answer", "Inna gra")

        val songs = DeckCodec.parse(jsonDeck(classic, game, movie, repeatedGame).toString(), "mixed.json").songs

        assertEquals(listOf("music-card", "game-card", "movie-card"), songs.map { it.id })
        assertEquals(listOf(GameMode.CLASSIC, GameMode.GAME, GameMode.MOVIE), songs.map { it.gameMode })
        assertEquals(listOf("", "Wiedźmin 3", "Tron"), songs.map { it.answer })
    }

    @Test
    fun `imports the playable rows of a mixed web deck and explains a YouTube-only deck`() {
        val youtubeOnly = jsonSong("youtube", christmas)
            .put("sources", JSONObject().put("youtube", "E8gmARGvPlI"))
        val mixed = jsonDeck(youtubeOnly, jsonSong("spotify", christmas))

        assertEquals(listOf("spotify"), DeckCodec.parse(mixed.toString(), "mixed.json").songs.map { it.id })
        assertCode("unsupported_youtube") {
            DeckCodec.parse(jsonDeck(youtubeOnly).toString(), "youtube.json")
        }
    }

    private fun jsonSong(id: String, spotify: String) = JSONObject()
        .put("id", id).put("title", "Song").put("artist", "Artist").put("year", 1999)
        .put("sources", JSONObject().put("spotify", spotify))

    private fun jsonDeck(vararg songs: JSONObject) = JSONObject().put("version", 1)
        .put("id", "deck").put("name", "Playlist").put("songs", JSONArray(songs.toList()))

    private fun legacyCard(sources: JSONObject, gameMode: String? = null): String {
        val card = JSONObject().put("v", 1).put("id", "old-card").put("theme", "fish")
            .put("sources", sources)
        gameMode?.let { card.put("gameMode", it) }
        val json = card.toString()
        return "https://example.org/#card=" + java.util.Base64.getUrlEncoder().withoutPadding()
            .encodeToString(json.toByteArray(Charsets.UTF_8))
    }

    private fun assertCode(code: String, action: () -> Unit) {
        val error = assertThrows(DeckFormatException::class.java) { action() }
        assertEquals(code, error.code)
    }
}
