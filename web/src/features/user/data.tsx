import { useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import {
  Button,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Input,
  Label,
  Section,
  getErrorMessage,
  toast,
} from '@mochi/web'
import { useExportData } from '@/hooks/use-account'
import WORDS from './data-words'

// ============================================================================
// Passphrase generation
// ============================================================================

function generatePassphrase(): string {
  const words: string[] = []
  const array = new Uint32Array(6)
  crypto.getRandomValues(array)
  for (let i = 0; i < 6; i++) {
    words.push(WORDS[array[i] % WORDS.length])
  }
  return words.join('-')
}

// ============================================================================
// Download helper
// ============================================================================

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// ============================================================================
// Migration bundle dialog
// ============================================================================

function MigrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const exportData = useExportData()
  const [passphrase, setPassphrase] = useState('')

  const handleGenerate = () => {
    setPassphrase(generatePassphrase())
  }

  const handleDownload = async () => {
    if (!passphrase.trim()) {
      toast.error(t`Enter a passphrase before downloading`)
      return
    }
    try {
      const blob = await exportData.mutateAsync({ keys: true, passphrase: passphrase.trim() })
      triggerDownload(blob, 'mochi-export.zip')
      onOpenChange(false)
      setPassphrase('')
      toast.success(t`Migration bundle downloaded`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Export failed`))
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassphrase('')
    }
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Download migration bundle</Trans>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            <Trans>Your private keys will be included, encrypted with the passphrase below.</Trans>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='export-passphrase'>
              <Trans>Passphrase</Trans>
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='export-passphrase'
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t`Enter or generate a passphrase`}
                className='font-mono'
                autoComplete='off'
                disabled={exportData.isPending}
              />
              <Button
                variant='outline'
                size='sm'
                onClick={handleGenerate}
                disabled={exportData.isPending}
                aria-label={t`Generate passphrase`}
              >
                <RefreshCw className='h-4 w-4' />
              </Button>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              <Trans>Store this passphrase safely — it's the only thing protecting the keys inside the bundle, and Mochi has no way to recover it.</Trans>
            </p>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={exportData.isPending}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            onClick={handleDownload}
            disabled={exportData.isPending || !passphrase.trim()}
          >
            {exportData.isPending ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : (
              <Download className='me-2 h-4 w-4' />
            )}
            <Trans>Download</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// ============================================================================
// Data Section
// ============================================================================

export function DataSection() {
  const { t } = useLingui()
  const exportData = useExportData()
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false)

  const handleGdprDownload = async () => {
    try {
      const blob = await exportData.mutateAsync({ keys: false, passphrase: '' })
      triggerDownload(blob, 'mochi-export.zip')
      toast.success(t`Data downloaded`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Export failed`))
    }
  }

  return (
    <Section title={t`Your data`}>
      <div className='space-y-4 py-2'>
        <p className='text-muted-foreground text-sm'>
          <Trans>Download a copy of your account data. The migration bundle also includes your private keys so you can move to a different server.</Trans>
        </p>
        <div className='flex flex-wrap gap-3'>
          <Button
            variant='outline'
            onClick={handleGdprDownload}
            disabled={exportData.isPending}
          >
            {exportData.isPending ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : (
              <Download className='me-2 h-4 w-4' />
            )}
            <Trans>Download my data</Trans>
          </Button>
          <Button
            variant='outline'
            onClick={() => setMigrationDialogOpen(true)}
            disabled={exportData.isPending}
          >
            <Download className='me-2 h-4 w-4' />
            <Trans>Download migration bundle</Trans>
          </Button>
        </div>
        <p className='text-muted-foreground text-xs'>
          <Trans>This captures your account as of now. Anything received after won't be in the download.</Trans>
        </p>
      </div>
      <MigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
      />
    </Section>
  )
}
