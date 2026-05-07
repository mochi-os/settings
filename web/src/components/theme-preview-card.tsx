import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { cn, type ThemeInfo } from '@mochi/web'

const SPACING_VARS: Record<string, { cardPy: string; ctrlH: string }> = {
  compact:     { cardPy: '0.875rem', ctrlH: '2rem'    },
  comfortable: { cardPy: '1rem',     ctrlH: '2.25rem' },
  spacious:    { cardPy: '1.25rem',  ctrlH: '2.5rem'  },
}

function buildPreviewVars(theme: ThemeInfo): CSSProperties {
  const h       = theme.hue
  const c       = theme.chroma
  const bg      = theme.hue_bg
  const density = SPACING_VARS[theme.spacing ?? 'comfortable'] ?? SPACING_VARS.comfortable

  return {
    '--preview-primary':    `oklch(0.488 ${c} ${h})`,
    '--preview-primary-fg': 'oklch(1 0 0)',
    '--preview-bg':         `oklch(0.985 ${c * 0.02} ${bg})`,
    '--preview-sidebar':    `oklch(0.97 ${c * 0.03} ${bg})`,
    '--preview-muted-2':    'oklch(0.9 0 0)',
    '--preview-border':     `oklch(0.905 ${c * 0.02} ${bg})`,
    '--preview-radius':     theme.border_radius || '0.75rem',
    '--preview-card-py':    density.cardPy,
    '--preview-ctrl-h':     density.ctrlH,
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
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--preview-muted-2)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--preview-muted-2)' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div
          style={{
            height: '16px',
            flexShrink: 0,
            background: 'var(--preview-muted-2)',
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
          <div style={{ height: '5px', borderRadius: '2px', background: 'var(--preview-muted-2)', width: '68%' }} />
          <div style={{ height: '5px', borderRadius: '2px', background: 'var(--preview-muted-2)', width: '48%' }} />
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
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

export function ThemePreviewCard({ theme, isSelected, onClick, disabled }: ThemePreviewCardProps) {
  const { t } = useLingui()

  const spacingLabels: Record<string, string> = {
    compact:     t`Compact`,
    comfortable: t`Comfortable`,
    spacious:    t`Spacious`,
  }
  // Only show a label when the value matches a known token. Falling back to
  // a default ("Comfortable") would silently mislabel themes whose spacing
  // value is missing or non-canonical, so we render nothing instead.
  const spacingLabel = theme.spacing ? spacingLabels[theme.spacing] : null

  const radiusLabels: Record<string, string> = {
    '0rem':     t`No radius`,
    '0.375rem': t`Small radius`,
    '0.75rem':  t`Medium radius`,
    '1.75rem':  t`Large radius`,
  }
  const radiusDescription = theme.border_radius ? radiusLabels[theme.border_radius] : null
  const metaParts = [spacingLabel, radiusDescription].filter(Boolean)

  return (
    <button
      style={buildPreviewVars(theme)}
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

      <div className="px-2.5 py-2 space-y-0.5 border-t border-border">
        <div className="text-sm font-medium truncate">{theme.label}</div>
        {metaParts.length > 0 && (
          <div className="text-xs text-muted-foreground truncate">
            {metaParts.join(' · ')}
          </div>
        )}
      </div>
    </button>
  )
}
