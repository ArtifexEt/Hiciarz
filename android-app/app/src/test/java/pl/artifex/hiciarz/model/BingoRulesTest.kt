package pl.artifex.hiciarz.model

import org.junit.Assert.assertEquals
import org.junit.Test

class BingoRulesTest {
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

}
