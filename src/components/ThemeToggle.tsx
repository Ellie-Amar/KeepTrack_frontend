import { useTheme } from '../theme/context'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <label className={`theme-toggle ${className}`.trim()}>
      <input
        type="checkbox"
        checked={theme === 'dark'}
        onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
      />
      <span>Sombre</span>
    </label>
  )
}
