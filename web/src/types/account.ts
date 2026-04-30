export interface Identity {
  entity: string
  fingerprint: string
  username: string
  name: string
  privacy: 'public' | 'private'
}

export interface Session {
  id: string
  address: string
  agent: string
  created: number
  accessed: number
  expires: number
}

export interface AccountData {
  identity: Identity
  role: string
  sessions: Session[]
}

export interface SessionsResponse {
  sessions: Session[]
}

// Login methods
export interface MethodsResponse {
  methods: string[]
}

// Passkeys
export interface Passkey {
  id: string
  name: string
  transports: string
  created: number
  last_used: number
}

export interface PasskeysResponse {
  passkeys: Passkey[]
}

export interface PasskeyRegisterBeginResponse {
  options: unknown
  ceremony: string
}

export interface PasskeyRegisterFinishResponse {
  status: string
  name: string
}

// TOTP
export interface TotpStatusResponse {
  enabled: boolean
}

export interface TotpSetupResponse {
  secret: string
  url: string
  issuer: string
  domain: string
}

export interface TotpVerifyResponse {
  ok: boolean
}

// Recovery codes
export interface RecoveryStatusResponse {
  count: number
}

export interface RecoveryGenerateResponse {
  codes: string[]
}

// OAuth
export type OAuthProvider =
  | 'facebook'
  | 'github'
  | 'google'
  | 'microsoft'
  | 'x'

export interface OAuthIdentity {
  provider: OAuthProvider
  email: string
  name: string
  created: number
  used: number
}

export interface OAuthIdentitiesResponse {
  identities: OAuthIdentity[]
}

export interface OAuthProvidersEnabled {
  facebook: boolean
  github: boolean
  google: boolean
  microsoft: boolean
  x: boolean
}

export interface AuthMethodsResponse {
  email: boolean
  passkey: boolean
  recovery: boolean
  signup: boolean
  oauth?: OAuthProvidersEnabled
}

export interface OAuthBeginResponse {
  url: string
}

// API Tokens
export interface Token {
  hash: string
  name: string
  scopes: string[]
  expires: string
  created: string
  last_used: string
}

export interface TokensResponse {
  tokens: Token[]
}

export interface TokenCreateResponse {
  token: string
}
