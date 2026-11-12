package pl.artifex.hiciarz.model

import java.util.Random

/** A recording is drawn only once, even if an imported deck contains several variants of it. */
private fun recordings(deck: Deck): List<Song> = deck.songs.distinctBy { it.spotifyId }

object TimelineRules {
    fun eligible(deck: Deck): List<Song> = recordings(deck).filter { it.year != null }

    fun start(deck: Deck, random: Random): TimelineState {
        val songs = eligible(deck)
        if (songs.size < 2) return TimelineState()
        val starter = songs[random.nextInt(songs.size)]
        val remaining = songs.filterNot { it.spotifyId == starter.spotifyId }
        val current = remaining[random.nextInt(remaining.size)]
        return TimelineState(board = listOf(starter), currentSong = current,
            playedIds = setOf(starter.spotifyId, current.spotifyId), round = 1,
            targetCards = minOf(10, songs.size))
    }

    fun choose(state: TimelineState, gap: Int): TimelineState =
        if (state.currentSong != null && !state.revealed && !state.finished && gap in 0..state.board.size)
            state.copy(selectedGap = gap) else state

    /** Equal years fit on either side of an existing card from that year. */
    fun validGaps(board: List<Song>, song: Song): List<Int> {
        val year = song.year ?: return emptyList()
        return (0..board.size).filter { gap ->
            (gap == 0 || year >= (board[gap - 1].year ?: Int.MAX_VALUE)) &&
                (gap == board.size || year <= (board[gap].year ?: Int.MIN_VALUE))
        }
    }

    fun reveal(state: TimelineState, deck: Deck): TimelineState {
        val song = state.currentSong ?: return state
        val gap = state.selectedGap ?: return state
        if (state.revealed || state.finished) return state
        val valid = validGaps(state.board, song)
        val correct = gap in valid
        val board = if (correct) state.board.toMutableList().apply { add(gap, song) } else state.board
        return state.copy(board = board, revealed = true, correct = correct,
            correctGap = if (correct) gap else valid.firstOrNull(),
            mistakes = state.mistakes + if (correct) 0 else 1,
            finished = board.size >= state.targetCards || eligible(deck).none { it.spotifyId !in state.playedIds })
    }

    fun next(state: TimelineState, deck: Deck, random: Random): TimelineState {
        if (!state.revealed || state.finished) return state
        val remaining = eligible(deck).filterNot { it.spotifyId in state.playedIds }
        if (remaining.isEmpty()) return state.copy(finished = true)
        val song = remaining[random.nextInt(remaining.size)]
        return state.copy(currentSong = song, selectedGap = null, revealed = false, correct = null,
            correctGap = null, playedIds = state.playedIds + song.spotifyId, round = state.round + 1)
    }
}

object QuizRules {
    fun start(deck: Deck, random: Random): QuizState {
        val songs = recordings(deck)
        if (songs.isEmpty()) return QuizState()
        val song = songs[random.nextInt(songs.size)]
        return QuizState(currentSong = song, playedIds = setOf(song.spotifyId), round = 1,
            targetScore = minOf(10, songs.size))
    }

    fun reveal(state: QuizState): QuizState =
        if (state.started && !state.finished && !state.answered) state.copy(revealed = true) else state

    fun answer(state: QuizState, correct: Boolean, deck: Deck): QuizState {
        if (!state.started || !state.revealed || state.answered || state.finished) return state
        val score = state.correctCount + if (correct) 1 else 0
        return state.copy(answered = true, correctCount = score,
            finished = score >= state.targetScore || recordings(deck).none { it.spotifyId !in state.playedIds })
    }

    fun next(state: QuizState, deck: Deck, random: Random): QuizState {
        if (!state.answered || state.finished) return state
        val remaining = recordings(deck).filterNot { it.spotifyId in state.playedIds }
        if (remaining.isEmpty()) return state.copy(finished = true)
        val song = remaining[random.nextInt(remaining.size)]
        return state.copy(currentSong = song, revealed = false, answered = false,
            playedIds = state.playedIds + song.spotifyId, round = state.round + 1)
    }
}
