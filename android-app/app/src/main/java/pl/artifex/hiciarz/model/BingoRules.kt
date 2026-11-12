package pl.artifex.hiciarz.model

import java.util.Random

object BingoRules {
    fun categories(level: BingoLevel): List<QuestionType> = when (level) {
        BingoLevel.BEGINNER -> listOf(QuestionType.BAND_OR_SOLO, QuestionType.BEFORE_2000,
            QuestionType.YEAR_WITHIN_FOUR, QuestionType.DECADE, QuestionType.YEAR_WITHIN_TWO)
        BingoLevel.EXPERT -> listOf(QuestionType.TITLE, QuestionType.YEAR, QuestionType.ARTIST,
            QuestionType.DECADE, QuestionType.YEAR_WITHIN_THREE)
    }

    /** An explicit redraw must visibly change the question, without changing its board level. */
    fun redraw(level: BingoLevel, current: QuestionType, random: Random): QuestionType {
        val alternatives = categories(level).filter { it != current }
        return alternatives[random.nextInt(alternatives.size)]
    }
}
