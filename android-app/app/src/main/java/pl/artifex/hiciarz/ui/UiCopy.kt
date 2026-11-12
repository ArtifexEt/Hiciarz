package pl.artifex.hiciarz.ui

import pl.artifex.hiciarz.model.*

internal class UiCopy(val language: String) {
    fun t(pl: String, en: String) = if (language == "en") en else pl
    fun tab(tab: AppTab) = when (tab) {
        AppTab.SCAN -> t("Skaner", "Scan")
        AppTab.BINGO -> "Bingo"
        AppTab.DECKS -> t("Talie", "Decks")
        AppTab.SETTINGS -> t("Opcje", "Settings")
    }
    fun mode(mode: GameMode) = when (mode) {
        GameMode.CLASSIC -> t("Muzyka", "Music")
        GameMode.GAME -> t("Zgadnij grę", "Guess the game")
        GameMode.MOVIE -> t("Zgadnij film", "Guess the film")
    }
    fun deck(deck: Deck) = if (!deck.bundled) deck.name else when {
        deck.id.contains("symphonic") -> t("Gry — symfonicznie", "Games — symphonic")
        deck.id.contains("original") -> t("Muzyka z gier", "Game soundtracks")
        deck.id.contains("christmas") -> t("Świąteczne przeboje", "Christmas hits")
        else -> deck.name
    }
    fun question(type: QuestionType) = when (type) {
        QuestionType.TITLE -> t("Jaki to tytuł?", "What's the title?")
        QuestionType.ARTIST -> t("Kto to wykonuje?", "Who's the artist?")
        QuestionType.YEAR -> t("Z którego roku?", "Which year?")
        QuestionType.SOURCE -> t("Skąd znasz ten utwór?", "Where is this track from?")
        else -> when (type.name) {
            "BAND_OR_SOLO" -> t("Zespół czy solista?", "Band or solo artist?")
            "BEFORE_2000" -> t("Przed czy po 2000?", "Before or after 2000?")
            "YEAR_WITHIN_FOUR" -> t("Podaj rok ±4", "Name the year ±4")
            "DECADE" -> t("Jaka dekada?", "Which decade?")
            "YEAR_WITHIN_TWO" -> t("Podaj rok ±2", "Name the year ±2")
            "YEAR_WITHIN_THREE" -> t("Podaj rok ±3", "Name the year ±3")
            else -> t("Z którego roku?", "Which year?")
        }
    }
    fun message(code: String): String = when (code) {
        "spotify_not_installed" -> t("Zainstaluj Spotify i zaloguj się na swoje konto.", "Install Spotify and sign in to your account.")
        "not_authorized", "user_not_authorized" -> t("Spotify nie udzieliło dostępu. Połącz konto ponownie.", "Spotify hasn't granted access. Connect your account again.")
        "client_id_missing" -> t("Spotify nie może połączyć się w tym wydaniu. Zgłoś problem.", "Spotify cannot connect in this build. Report the problem.")
        "connection_failed", "connection_timeout" -> t("Nie udało się połączyć ze Spotify. Otwórz Spotify i spróbuj ponownie.", "Couldn't connect to Spotify. Open Spotify and try again.")
        "premium_required" -> t("Odtwarzanie wybranego utworu wymaga Spotify Premium.", "Playing a specific track requires Spotify Premium.")
        "playback_failed" -> t("Nie udało się uruchomić utworu. Spróbuj ponownie.", "Couldn't start this track. Try again.")
        "invalid_qr", "invalid_code", "invalid_spotify_uri", "invalid_track" -> t("To nie jest kod karty Hiciarza ani link do utworu Spotify.", "This isn't a Hiciarz card code or a Spotify track link.")
        "unsupported_source", "unsupported_youtube" -> t("Ta karta nie zawiera utworu Spotify.", "This card doesn't contain a Spotify track.")
        "pairing_not_supported" -> t("To kod parowania wersji webowej. Zeskanuj kod z karty muzycznej.", "This is a web pairing code. Scan a music card instead.")
        "duplicate_scan" -> t("Ta karta jest już odczytana. Wybierz następną kartę.", "This card has already been scanned. Choose the next card.")
        "spotify_login_required" -> t("Zaloguj się w aplikacji Spotify i połącz ponownie.", "Sign in to the Spotify app and connect again.")
        "spotify_offline" -> t("Spotify jest offline. Połącz telefon z internetem i spróbuj ponownie.", "Spotify is offline. Connect your phone to the internet and try again.")
        "spotify_update_required" -> t("Zaktualizuj aplikację Spotify, a potem połącz ponownie.", "Update the Spotify app, then connect again.")
        "spotify_disconnected" -> t("Połączenie ze Spotify zostało przerwane. Połącz ponownie.", "Spotify disconnected. Connect again.")
        "device_transfer_failed" -> t("Nie udało się zmienić odtwarzania w Spotify.", "Couldn't change playback in Spotify.")
        "camera_permission_required" -> t("Zezwól na dostęp do aparatu, aby skanować karty.", "Allow camera access to scan cards.")
        "camera_unavailable" -> t("Aparat jest niedostępny. Zamknij inną aplikację używającą aparatu i spróbuj ponownie.", "The camera isn't available. Close another app using it and try again.")
        "camera_scan_failed" -> t("Nie udało się odczytać obrazu z aparatu. Spróbuj ponownie.", "Couldn't read the camera image. Try again.")
        "deck_imported" -> t("Talia dodana", "Deck added")
        "deck_deleted" -> t("Talia usunięta", "Deck deleted")
        "invalid_deck", "import_failed" -> t("Nie udało się odczytać talii. Wybierz plik JSON lub CSV z Hiciarza.", "Couldn't read the deck. Choose a JSON or CSV file from Hiciarz.")
        "bingo_finished", "deck_exhausted" -> t("Wszystkie utwory zostały wylosowane. Rozpocznij nową rundę.", "Every track has been drawn. Start a new round.")
        "empty_deck", "no_deck", "choose_deck" -> t("Najpierw wybierz talię z utworami Spotify.", "Choose a deck with Spotify tracks first.")
        "import_too_large" -> t("Plik jest za duży. Wybierz mniejszą talię JSON lub CSV.", "This file is too large. Choose a smaller JSON or CSV deck.")
        "invalid_client_id" -> t("Nieprawidłowe ustawienia połączenia.", "The connection settings are invalid.")
        "timeline_needs_years" -> t("Ta talia potrzebuje co najmniej dwóch kart z rokiem.", "This deck needs at least two cards with a year.")
        else -> t("Nie udało się wykonać tej czynności. Spróbuj ponownie.", "That action could not be completed. Try again.")
    }

    fun skin(skin: CardSkin) = when (skin) {
        CardSkin.CLASSIC -> t("Klasyczna", "Classic")
        CardSkin.MINIMAL -> t("Minimal", "Minimal")
        CardSkin.VINYL -> t("Winyl", "Vinyl")
        CardSkin.MIXTAPE -> t("Kaseta", "Mixtape")
        CardSkin.MEMPHIS -> "Memphis"
        CardSkin.DISCO -> "Disco"
        CardSkin.CHRISTMAS -> t("Święta", "Christmas")
        CardSkin.WINTER -> t("Zima", "Winter")
        CardSkin.FISH -> t("Rybki", "Fish")
    }
    fun game(mode: CardlessMode) = when (mode) {
        CardlessMode.TIMELINE -> t("Oś czasu", "Timeline")
        CardlessMode.QUIZ -> t("Zgadnij", "Guess")
        CardlessMode.BINGO -> "Bingo"
    }
    fun shortQuestion(type: QuestionType) = when (type) {
        QuestionType.TITLE -> t("Tytuł", "Title")
        QuestionType.ARTIST -> t("Wykonawca", "Artist")
        QuestionType.YEAR -> t("Rok", "Year")
        QuestionType.SOURCE -> t("Źródło", "Source")
        QuestionType.BAND_OR_SOLO -> t("Zespół / solo", "Band / solo")
        QuestionType.BEFORE_2000 -> "2000"
        QuestionType.DECADE -> t("Dekada", "Decade")
        QuestionType.YEAR_WITHIN_TWO -> t("Rok ±2", "Year ±2")
        QuestionType.YEAR_WITHIN_THREE -> t("Rok ±3", "Year ±3")
        QuestionType.YEAR_WITHIN_FOUR -> t("Rok ±4", "Year ±4")
    }
}
