import { useEffect, useState } from 'react'
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
  getApiBasepath,
  getErrorMessage,
  isInShell,
  toast,
} from '@mochi/web'
import { useExportData, useSendExportCode } from '@/hooks/use-account'
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

// A friendly, filesystem-safe download name in the browser's local time.
// The server's on-disk name is UTC for stability; this is what the user
// actually sees saved. Fixed YYYY-MM-DD-HHMM layout, not a localised date
// format, so it stays sortable and valid as a filename everywhere.
function localExportName(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `mochi-export-${stamp}.zip`
}

// The bundle can be many gigabytes, so we never buffer it in the iframe.
// The build action returns a filename; the browser then streams the file
// straight to disk via a top-window navigation to the public download
// action (which serves it with Content-Disposition: attachment, so the
// shell page stays put). The navigation must run in the top window
// because only it carries the session cookie. `_shell=1` tells the server
// to serve the raw app response rather than wrap it in the menu shell —
// the same signal the shell's own iframe uses for app content.
function startDownload(filename: string): void {
  let base = getApiBasepath()
  if (!base.endsWith('-/')) {
    base = (base.endsWith('/') ? base : base + '/') + '-/'
  }
  const url =
    base +
    'user/account/export/download?file=' +
    encodeURIComponent(filename) +
    '&name=' +
    encodeURIComponent(localExportName()) +
    '&_shell=1'
  if (isInShell()) {
    window.parent.postMessage({ type: 'navigate-top', url }, '*')
  } else {
    window.location.href = url
  }
}

// ============================================================================
// Download dialog
// ============================================================================

function DownloadDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const exportData = useExportData()
  const sendCode = useSendExportCode()
  const [passphrase, setPassphrase] = useState('')
  const [code, setCode] = useState('')

  // Email a one-time code the moment the dialog opens (the export's
  // second factor). Sending here, not on submit, puts the code in the
  // user's inbox while they're still choosing a passphrase — and alerts
  // them immediately if a stolen session opened this dialog.
  useEffect(() => {
    if (!open) return
    sendCode.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err, t`Couldn't send the code`)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleGenerate = () => {
    setPassphrase(generatePassphrase())
  }

  const handleResend = () => {
    sendCode.mutate(undefined, {
      onSuccess: () => toast.success(t`Code sent`),
      onError: (err) => toast.error(getErrorMessage(err, t`Couldn't send the code`)),
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassphrase('')
      setCode('')
    }
    onOpenChange(next)
  }

  const handleDownload = async () => {
    if (!passphrase.trim() || !code.trim()) {
      return
    }
    try {
      const { filename } = await exportData.mutateAsync({
        passphrase: passphrase.trim(),
        code: code.trim(),
      })
      startDownload(filename)
      handleOpenChange(false)
      toast.success(t`Your data is downloading`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Export failed`))
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Download your data</Trans>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            <Trans>This is a complete backup you can restore on this or another Mochi server.</Trans>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='export-code' className='text-base font-semibold'>
              <Trans>Email code</Trans>
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='export-code'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t`Enter the code from your email`}
                className='font-mono'
                autoComplete='one-time-code'
                disabled={exportData.isPending}
              />
              <Button
                variant='outline'
                size='sm'
                onClick={handleResend}
                disabled={sendCode.isPending || exportData.isPending}
              >
                <Trans>Resend</Trans>
              </Button>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              <Trans>We emailed a code to your account address. Enter it to authorise this download.</Trans>
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='export-passphrase' className='text-base font-semibold'>
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
              <Trans>Your private keys are included, encrypted with this passphrase. Store it safely. You'll need it to restore.</Trans>
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
            disabled={exportData.isPending || !passphrase.trim() || !code.trim()}
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
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Section
        title={t`Your data`}
        action={
          <Button variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
            <Download className='me-2 h-4 w-4' />
            <Trans>Download</Trans>
          </Button>
        }
      />
      <DownloadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
