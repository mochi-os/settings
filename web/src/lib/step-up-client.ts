import { requestHelpers, type StepUpClient, type StepUpResult } from '@mochi/web'
import endpoints from '@/api/endpoints'

// Errors surface inline in the StepUpDialog, so suppress the global toast.
const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

type MethodStateMap = Record<string, { state: string }>

async function fetchMethodStates(): Promise<MethodStateMap> {
  return (
    await requestHelpers.get<{ methods: MethodStateMap }>(endpoints.user.accountMethods)
  ).methods
}

// The required step-up factors, mirroring the server's reauthentication_required:
// the methods whose per-user state is "required", with OAuth re-verified as its
// own oauth factor and recovery excluded. Empty when nothing is required.
function requiredFactors(map: MethodStateMap): string[] {
  const required = Object.entries(map)
    .filter(([, info]) => info.state === 'required')
    .map(([method]) => method)
    .filter((m) => m !== 'recovery')
  return Array.from(new Set(required))
}

// base64url(bytes), no padding - matches Go's base64.RawURLEncoding so the
// server can recompute the challenge from the verifier.
function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier(): string {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

// challenge = base64url(sha256(verifier)); the dialog holds the verifier and
// sends only the challenge to begin, then presents the verifier to finish.
async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

// StepUpClient implementation for the settings app: wires the shared lib/web
// StepUpDialog to settings' own re-authentication actions (each backed by
// mochi.user.code.verify / totp.verify / passkey.verify / oauth.verify and
// mochi.user.methods.get / oauth.list). A lib/web component can't reference
// these paths itself, so the app injects this.
export const stepUpClient: StepUpClient = {
  methods: async () => {
    const map = await fetchMethodStates()
    const required = requiredFactors(map)
    // OAuth is surfaced separately via oauthProviders, never as a code field,
    // so drop it here. An oauth-only requirement leaves no code factor - the
    // dialog then shows just the provider button(s).
    if (required.length) return required.filter((m) => m !== 'oauth')
    // Nothing is required: offer every usable code/credential factor so any
    // one satisfies the step-up (OAuth is offered separately via
    // oauthProviders). A factor's state is "disabled" when the user turned it
    // off or its credential is missing.
    return ['email', 'passkey', 'totp'].filter(
      (m) => map[m] && map[m].state !== 'disabled',
    )
  },
  send: async () => {
    await requestHelpers.post<{ ok: boolean }>(endpoints.user.accountCode, {}, NO_TOAST)
  },
  verifyEmail: (code) =>
    requestHelpers.post<StepUpResult>(endpoints.user.accountCodeVerify, { code }, NO_TOAST),
  verifyTotp: (code) =>
    requestHelpers.post<StepUpResult>(endpoints.user.accountTotpVerify, { code }, NO_TOAST),
  passkeyBegin: () =>
    requestHelpers.post<{ ceremony: string; options: unknown }>(
      endpoints.user.accountPasskeyVerifyBegin,
      {},
      NO_TOAST,
    ),
  passkeyFinish: (ceremony, assertion) =>
    requestHelpers.post<StepUpResult>(
      endpoints.user.accountPasskeyVerifyFinish,
      { ceremony, assertion },
      NO_TOAST,
    ),
  oauthProviders: async () => {
    // OAuth re-verifies the oauth factor (a linked provider proves the provider
    // account, not the email inbox). It satisfies a step-up only when oauth is
    // required, or nothing is required (any one factor) and the user hasn't
    // disabled OAuth. A required email factor therefore needs a real email
    // code, not a provider sign-in - so hide the buttons in that case.
    const map = await fetchMethodStates()
    const required = requiredFactors(map)
    const acceptable =
      required.includes('oauth') ||
      (required.length === 0 && Boolean(map.oauth) && map.oauth.state !== 'disabled')
    if (!acceptable) return []
    const { identities } = await requestHelpers.get<{ identities: Array<{ provider: string }> }>(
      endpoints.user.accountOauth,
    )
    return Array.from(new Set((identities ?? []).map((i) => i.provider)))
  },
  oauthVerify: async (provider) => {
    const verifier = randomVerifier()
    const challenge = await challengeFor(verifier)
    const { url } = await requestHelpers.post<{ url: string }>(
      endpoints.user.accountOauthVerifyBegin,
      { provider, challenge },
      NO_TOAST,
    )
    // In the sandboxed shell iframe, window.open opens the popup but returns
    // null (the escaped popup has no opener handle), so DON'T treat null as
    // failure - poll for the proof the popup's callback stores either way. The
    // proof is keyed by the verifier the dialog alone holds. When we do get a
    // handle (top-window), popup.closed gives fast cancellation; otherwise we
    // fall back to the timeout.
    const popup = window.open(url, 'mochi-oauth-stepup', 'width=520,height=680')
    const deadline = Date.now() + 120_000
    let closedAt = 0
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const result = await requestHelpers.post<StepUpResult>(
        endpoints.user.accountOauthVerifyFinish,
        { verifier },
        NO_TOAST,
      )
      if (result && (result.token || result.remaining)) return result
      if (popup && popup.closed) {
        if (!closedAt) closedAt = Date.now()
        else if (Date.now() - closedAt > 2500) throw new Error('oauth-cancelled')
      }
      if (Date.now() > deadline) throw new Error('oauth-timeout')
    }
  },
}
