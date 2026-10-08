import { useTheme, type Theme } from '../lib/theme';
import Icon, { type IconName } from './Icon';

const ORDER: Theme[] = ['system', 'light', 'dark'];
const INFO: Record<Theme, { icon: IconName; label: string }> = {
  system: { icon: 'monitor', label: 'Match system' },
  light: { icon: 'sun', label: 'Light' },
  dark: { icon: 'moon', label: 'Dark' },
};

/** One 44px button cycles System, Light, Dark. "Match system" is the default and follows the OS live. */
export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button" className="ib border border-line bg-card text-ink"
      title={`Theme: ${INFO[theme].label}. Tap for ${INFO[next].label}.`}
      aria-label={`Theme: ${INFO[theme].label}. Switch to ${INFO[next].label}`}
      onClick={() => setTheme(next)}
    >
      <Icon name={INFO[theme].icon} />
    </button>
  );
}
