package pl.artifex.hiciarz.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random

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

    @Test fun `redrawing always changes the question and stays on the printed board`() {
        val random = Random(42)
        BingoLevel.entries.forEach { level ->
            BingoRules.categories(level).forEach { previous ->
                val draws = List(200) { BingoRules.redraw(level, previous, random) }
                draws.forEach { next ->
                    assertNotEquals(previous, next)
                    assertTrue(next in BingoRules.categories(level))
                }
                assertEquals(BingoRules.categories(level).toSet() - previous, draws.toSet())
            }
        }
    }

}
