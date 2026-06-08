import { useLingui, Trans } from '@lingui/react/macro'
import { UserX } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Section,
  getErrorMessage,
  isInShell,
  toast,
  useFormat,
} from '@mochi/web'
import { useCloseAccount } from '@/hooks/use-account'
import { useStepUp } from '@/lib/use-step-up'

// Soft-delete: closing the account marks it for deletion after a grace
// period and revokes every session, so the shell loses auth immediately.
// Bounce to the top-level URL; the user lands on login and, on
// re-authenticating, reaches the reactivation interstitial.
function goToLogin() {
  const url = '/'
  if (isInShell()) {
    window.parent.postMessage({ type: 'navigate-top', url }, '*')
  } else {
    window.location.href = url
  }
}

export function CloseAccountSection() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const closeAccount = useCloseAccount()
  const stepUp = useStepUp()

  // Confirmed in the dialog, then step-up verified: mark the account for
  // deletion and sign the user out.
  const runClose = (token: string) => {
    closeAccount.mutate(
      { token },
      {
        onSuccess: ({ purge }) => {
          toast.success(
            t`Your account is scheduled for deletion on ${formatTimestamp(purge)}. Log in before then to cancel.`
          )
          goToLogin()
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Could not close your account`))
        },
      }
    )
  }

  return (
    <>
      <Section
        title={t`Close account`}
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='outline' size='sm'>
                <UserX className='me-2 h-4 w-4' />
                <Trans>Close account</Trans>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Trans>Close your account?</Trans>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>
                    Your account will be scheduled for deletion and you'll be signed out. You can cancel any time before the deletion date by logging back in. Download your data first if you want to keep a copy.
                  </Trans>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Trans>Cancel</Trans>
                </AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  onClick={() => stepUp.request(runClose)}
                >
                  <Trans>Close account</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
      {stepUp.dialog}
    </>
  )
}
