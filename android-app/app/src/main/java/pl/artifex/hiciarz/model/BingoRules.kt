package pl.artifex.hiciarz.model

object BingoRules {
    fun categories(level: BingoLevel): List<QuestionType> = when (level) {
        BingoLevel.BEGINNER -> listOf(QuestionType.BAND_OR_SOLO, QuestionType.BEFORE_2000,
            QuestionType.YEAR_WITHIN_FOUR, QuestionType.DECADE, QuestionType.YEAR_WITHIN_TWO)
        BingoLevel.EXPERT -> listOf(QuestionType.TITLE, QuestionType.YEAR, QuestionType.ARTIST,
            QuestionType.DECADE, QuestionType.YEAR_WITHIN_THREE)
    }
}
