package pl.artifex.hiciarz.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BingoRulesTest {
    private val first = Song("local-1", "One", "Artist", 1994, "2FRnf9qhLbvw8fu4IBXx78")
    private val second = Song("local-2", "Two", "Artist", 2001, "0GjEhVFGZW8afUYGChu3Rr")

    @Test
    fun `question slots match the five printed web board categories for both levels`() {
        // Slot order is part of the paper-board contract in web/src/locales/en.json.
        assertEquals(listOf(
            QuestionType.BAND_OR_SOLO, QuestionType.BEFORE_2000, QuestionType.YEAR_WITHIN_FOUR,
            QuestionType.DECADE, QuestionType.YEAR_WITHIN_TWO,
        ), BingoRules.categories(BingoLevel.BEGINNER))
        assertEquals(listOf(
            QuestionType.TITLE, QuestionType.YEAR, QuestionType.ARTIST,
            QuestionType.DECADE, QuestionType.YEAR_WITHIN_THREE,
        ), BingoRules.categories(BingoLevel.EXPERT))
        BingoLevel.entries.forEach { level ->
            assertEquals(5, BingoRules.categories(level).distinct().size)
        }
    }

    @Test
    fun `never draws an already played recording even after importing a different card id`() {
        val importedAgain = first.copy(id = "web-card-id", title = "Edited title")
        val deck = Deck("deck", "Imported", listOf(first, importedAgain, second))
        val history = listOf(first.copy(id = "previous-import-id"))

        assertEquals(listOf(second), BingoRules.remaining(deck, history))
        assertEquals(3, deck.songs.size)
        assertEquals(1, history.size)
    }

    @Test
    fun `history from another deck excludes matching recordings without excluding unrelated tracks`() {
        val deck = Deck("deck", "New deck", listOf(first, second))
        val outside = Song("other", "Other", "Artist", 2010, "09VaRXynySDWbahfxioD14")

        assertEquals(listOf(second), BingoRules.remaining(deck, listOf(outside, first, first)))
        assertEquals(listOf(first, second), BingoRules.remaining(deck, emptyList()))
    }

    @Test
    fun `finishing a deck leaves no drawable songs until history is reset`() {
        val deck = Deck("deck", "Game", listOf(first, second))

        assertTrue(BingoRules.remaining(deck, listOf(second, first)).isEmpty())
        assertEquals(deck.songs, BingoRules.remaining(deck, emptyList()))
        assertTrue(BingoRules.remaining(deck.copy(songs = emptyList()), listOf(first)).isEmpty())
    }
}
