package pl.artifex.hiciarz

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import pl.artifex.hiciarz.model.CardSkin
import pl.artifex.hiciarz.ui.FlippingTicket
import pl.artifex.hiciarz.ui.HiciarzTheme
import pl.artifex.hiciarz.ui.YearTicket

@RunWith(AndroidJUnit4::class)
class FlippingTicketTest {
    @get:Rule val compose = createComposeRule(effectContext = object : MotionDurationScale {
        override val scaleFactor = 1f
    })

    @Test fun answerAppearsAfterTheTurnAndANewCardStartsHidden() {
        val revealed = mutableStateOf(false)
        val card = mutableStateOf("first")
        compose.setContent {
            HiciarzTheme {
                FlippingTicket(card.value, revealed.value) { answerSide ->
                    YearTicket(CardSkin.CLASSIC, if (answerSide) "1984" else "?", "Your card",
                        title = if (answerSide) "A longer answer taking more space on the card" else null,
                        subtitle = if (answerSide) "The artist" else null,
                        answerSide = answerSide, cardId = card.value)
                }
            }
        }
        compose.onNodeWithText("1984").assertDoesNotExist()
        compose.mainClock.autoAdvance = false
        compose.runOnIdle { revealed.value = true }
        compose.mainClock.advanceTimeBy(32)
        compose.onNodeWithText("?").assertIsDisplayed()
        compose.onNodeWithText("1984").assertDoesNotExist()
        compose.mainClock.advanceTimeBy(700)
        compose.onNodeWithText("1984").assertIsDisplayed()
        compose.onNodeWithText("?").assertDoesNotExist()
        compose.runOnIdle { card.value = "next"; revealed.value = false }
        compose.mainClock.advanceTimeByFrame()
        compose.onNodeWithText("?").assertIsDisplayed()
        compose.onNodeWithText("1984").assertDoesNotExist()
        compose.mainClock.autoAdvance = true
    }
}
