package pl.artifex.hiciarz.model

import java.util.Random
import org.junit.Assert.*
import org.junit.Test

class CardlessRulesTest {
    private fun song(index: Int, year: Int?) = Song("card-$index", "Song $index", "Artist", year,
        index.toString().padStart(22, '0'))
    private fun deck(vararg years: Int?) = Deck("deck", "Timeline", years.mapIndexed { index, year -> song(index, year) })

    @Test fun `a new timeline has one visible starter and a different hidden recording`() {
        val session = TimelineRules.start(deck(1980, 1990, 2000), Random(4))
        assertEquals(1, session.board.size)
        assertNotEquals(session.board.single().spotifyId, session.currentSong?.spotifyId)
        assertFalse(session.revealed)
        assertEquals(2, session.playedIds.size)
        assertEquals(3, session.targetCards)
    }

    @Test fun `equal release years fit before between or after matching timeline cards`() {
        val board = listOf(song(0, 1980), song(1, 1990), song(2, 1990), song(3, 2000))
        assertEquals(listOf(1, 2, 3), TimelineRules.validGaps(board, song(9, 1990)))
        assertEquals(listOf(0, 1), TimelineRules.validGaps(board, song(9, 1980)))
        assertEquals(listOf(4), TimelineRules.validGaps(board, song(9, 2001)))
    }

    @Test fun `a misplaced song shows its correct gap without awarding a card`() {
        val source = deck(1980, 1990, 2000)
        val before = TimelineState(board = listOf(source.songs[0], source.songs[2]), currentSong = source.songs[1],
            selectedGap = 0, playedIds = source.songs.map { it.spotifyId }.toSet(), targetCards = 3)
        val revealed = TimelineRules.reveal(before, source)
        assertFalse(revealed.correct!!)
        assertEquals(1, revealed.correctGap)
        assertEquals(before.board, revealed.board)
        assertEquals(1, revealed.mistakes)
        assertTrue(revealed.finished)
        assertFalse(revealed.won)
        assertEquals(revealed, TimelineRules.reveal(revealed, source))
    }

    @Test fun `every recording is used once and a short timeline can be won`() {
        val source = deck(2000, 1984, 1991, 1991, 1970)
        var state = TimelineRules.start(source, Random(11))
        val seen = mutableSetOf(state.board.single().spotifyId)
        while (!state.finished) {
            val current = requireNotNull(state.currentSong)
            assertTrue(seen.add(current.spotifyId))
            state = TimelineRules.choose(state, TimelineRules.validGaps(state.board, current).last())
            state = TimelineRules.reveal(state, source)
            assertTrue(state.correct!!)
            if (!state.finished) state = TimelineRules.next(state, source, Random(11))
        }
        assertTrue(state.won)
        assertEquals(5, state.board.size)
        assertEquals(5, seen.size)
        assertEquals(state.board.map { it.year }.sortedBy { it }, state.board.map { it.year })
    }

    @Test fun `timeline cannot advance before placement and reveal or use unknown years`() {
        val source = deck(1984, 2000, null)
        val state = TimelineRules.start(source, Random(0))
        assertEquals(state, TimelineRules.next(state, source, Random(0)))
        assertEquals(state, TimelineRules.reveal(state, source))
        assertEquals(state, TimelineRules.choose(state, -1))
        assertEquals(state, TimelineRules.choose(state, 3))
        assertFalse(TimelineRules.start(deck(null, 1984), Random(0)).started)
    }

    @Test fun `duplicate card variants are one recording and targets are bounded at ten`() {
        val songs = (0 until 15).map { song(it, 1980 + it) }
        val source = Deck("mixed", "Mixed", songs + songs.first().copy(id = "game-copy", gameMode = GameMode.GAME, answer = "A game"))
        assertEquals(15, TimelineRules.eligible(source).size)
        assertEquals(10, TimelineRules.start(source, Random(0)).targetCards)
        assertEquals(10, QuizRules.start(source, Random(0)).targetScore)
    }

    @Test fun `quiz requires reveal then one judgement and exhausts the deck after misses`() {
        val source = deck(1984, 2000, 1990)
        var state = QuizRules.start(source, Random(5))
        assertEquals(state, QuizRules.next(state, source, Random(5)))
        assertEquals(state, QuizRules.answer(state, true, source))
        val seen = mutableSetOf<String>()
        while (!state.finished) {
            assertTrue(seen.add(requireNotNull(state.currentSong).spotifyId))
            state = QuizRules.reveal(state)
            state = QuizRules.answer(state, false, source)
            assertEquals(state, QuizRules.answer(state, true, source))
            if (!state.finished) state = QuizRules.next(state, source, Random(5))
        }
        assertEquals(3, seen.size)
        assertEquals(0, state.correctCount)
        assertFalse(state.won)
    }

}
