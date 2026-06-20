import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { cn, type ThemeInfo } from '@mochi/web'

type Presets = Record<string, Record<string, string>>

function buildPreviewVars(theme: ThemeInfo, presets: Presets | undefined): CSSProperties {
  const h     = theme.hue
  const c     = theme.chroma
  // Per-theme primary lightness (theme.css --primary-l, default 0.488). Honour
  // it here so the swatch matches the real rendered accent instead of drifting.
  const pl    = theme.overrides?.['--primary-l'] ?? '0.488'
  const bundle = presets?.[theme.spacing ?? 'comfortable'] ?? presets?.comfortable ?? {}

  // Mirror theme.css: only --primary (and friends) carry the hue. Surfaces,
  // borders, and muted text are pure neutrals — adding tint here makes the
  // preview look like a different theme than the one the user actually gets.
  // Density-driven dimensions (--card-py, --control-height-md) come straight
  // from the server's mochi.app.presets() so the table doesn't drift.
  return {
    '--preview-primary': `oklch(${pl} ${c} ${h})`,
    '--preview-bg':      'oklch(1 0 0)',
    '--preview-sidebar': 'oklch(0.985 0 0)',
    '--preview-border':  'oklch(0.922 0 0)',
    '--preview-muted':   'oklch(0.85 0 0)',
    '--preview-radius':  theme.border_radius || '0.75rem',
    '--preview-card-py': bundle['--card-py'] ?? '1rem',
    '--preview-ctrl-h':  bundle['--control-height-md'] ?? '2.25rem',
  } as CSSProperties
}

function ThemeMiniMockup() {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        aspectRatio: '8 / 5',
        overflow: 'hidden',
        background: 'var(--preview-bg)',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '28%',
          flexShrink: 0,
          background: 'var(--preview-sidebar)',
          borderRight: '1px solid var(--preview-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '10px',
          gap: '5px',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--preview-primary)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--preview-muted)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--preview-muted)' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div
          style={{
            height: '16px',
            flexShrink: 0,
            background: 'var(--preview-bg)',
            borderBottom: '1px solid var(--preview-border)',
          }}
        />

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(var(--preview-card-py) * 0.45)',
          }}
        >
          <div style={{ height: '5px', borderRadius: '2px', background: 'var(--preview-muted)', width: '68%' }} />
          <div style={{ height: '5px', borderRadius: '2px', background: 'var(--preview-muted)', width: '48%' }} />
          <div style={{ flex: 1 }} />
          {/* Button — shows radius + density */}
          <div
            style={{
              height: 'calc(var(--preview-ctrl-h) * 0.55)',
              width: '52%',
              borderRadius: 'calc(var(--preview-radius) * 0.7)',
              background: 'var(--preview-primary)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface ThemePreviewCardProps {
  theme: ThemeInfo
  presets: Presets | undefined
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

export function ThemePreviewCard({ theme, presets, isSelected, onClick, disabled }: ThemePreviewCardProps) {
  const { t } = useLingui()
  const label = theme.development ? t`${theme.label} (development)` : theme.label
  return (
    <button
      style={buildPreviewVars(theme, presets)}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        disabled && 'pointer-events-none opacity-60'
      )}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <div className="relative w-full">
        <ThemeMiniMockup />
        {isSelected && (
          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary">
            <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />
          </span>
        )}
      </div>

      <div className="px-2.5 py-2 border-t border-border">
        <div className="text-sm font-medium truncate">{label}</div>
      </div>
    </button>
  )
}
