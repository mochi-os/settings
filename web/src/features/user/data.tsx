// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { Download, RefreshCw } from 'lucide-react'
import {
  Button,
  CopyButton,
  Label,
  Section,
  StepUpDialog,
  Textarea,
  getApiBasepath,
  getErrorMessage,
  shellNavigateTop,
  toast,
} from '@mochi/web'
import { useExportData } from '@/hooks/use-account'
import { stepUpClient } from '@/lib/step-up-client'
import WORDS from './data-words'

// ============================================================================
// Passphrase generation
// ============================================================================

// The bundle holds the passphrase-encrypted private keys and can be attacked
// offline, so entropy is what matters: ten words from this 248-word list is
// 79.5 bits (six was 47.7, within reach of a well-funded attack).
const PASSPHRASE_WORDS = 10

// Uniform index into WORDS. Rejection sampling, not a modulo: 2^32 is not a
// multiple of 248, so `random % 248` favours the first 128 words. The bias is
// tiny and it is still free to not have it in key-bearing material.
function pickWord(): string {
  const limit = Math.floor(0x100000000 / WORDS.length) * WORDS.length
  const draw = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(draw)
    if (draw[0] < limit) {
      return WORDS[draw[0] % WORDS.length]
    }
  }
}

function generatePassphrase(): string {
  const words: string[] = []
  for (let i = 0; i < PASSPHRASE_WORDS; i++) {
    words.push(pickWord())
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

// The bundle can be many gigabytes, so it is never buffered in the iframe: a
// top-window navigation (the only one carrying the session cookie) streams the
// public download action to disk. _shell=1 serves the raw response, not the
// shell.
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
  shellNavigateTop(url)
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
  const [passphrase, setPassphrase] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassphrase('')
    }
    onOpenChange(next)
  }

  // The StepUpDialog hands back a proof token once the user has re-verified
  // their login factor(s); combine it with the passphrase to build the
  // bundle and stream it down.
  const onVerified = async (token: string) => {
    try {
      const { filename } = await exportData.mutateAsync({
        passphrase: passphrase.trim(),
        token,
      })
      startDownload(filename)
      handleOpenChange(false)
      toast.success(t`Your data is downloading`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Export failed`))
    }
  }

  return (
    <StepUpDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t`Download your data`}
      description={t`This is a complete backup you can restore on this or another Mochi server. Verify it's you to continue.`}
      client={stepUpClient}
      canVerify={!!passphrase.trim()}
      submitLabel={t`Download`}
      onVerified={onVerified}
    >
      <div className='space-y-2'>
        <Label htmlFor='export-passphrase' className='text-base font-semibold'>
          <Trans>Passphrase</Trans>
        </Label>
        {/* A ten-word phrase does not fit one line, and this is the one string
            the user has to copy down before the bundle becomes unrecoverable,
            so it wraps rather than scrolling its tail out of view. */}
        <div className='flex items-start gap-2'>
          <Textarea
            id='export-passphrase'
            rows={2}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={t`Enter or generate a passphrase`}
            className='resize-none font-mono'
            autoComplete='off'
          />
          <div className='flex flex-col gap-1'>
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              onClick={() => setPassphrase(generatePassphrase())}
              aria-label={t`Generate passphrase`}
            >
              <RefreshCw className='h-4 w-4' />
            </Button>
            <CopyButton value={passphrase} disabled={!passphrase} variant='outline' />
          </div>
        </div>
        <p className='text-muted-foreground text-xs leading-relaxed'>
          <Trans>Your private keys are included, encrypted with this passphrase. Store it safely. You'll need it to restore.</Trans>
        </p>
      </div>
    </StepUpDialog>
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
