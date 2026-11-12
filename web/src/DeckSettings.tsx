import GameModePicker from './GameModePicker';
import { useTranslation } from './i18n';
import type { GameMode } from './model';
import './deck-settings.css';

export default function DeckSettings({
  gameMode,
  onChange,
  mixedModes,
}: {
  gameMode: GameMode;
  onChange: (mode: GameMode) => void;
  mixedModes: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="deck-settings" aria-label={t('deckSettings.defaultType')}>
      <p className="deck-settings-intro">{t('deckSettings.defaultType')}</p>
      <GameModePicker value={gameMode} onChange={onChange} compact />
      <p className="hint">
        {t(mixedModes ? 'creator.mixedModes' : 'app.thisChoiceAppliesToNewCardsChange')}
      </p>
    </section>
  );
}
