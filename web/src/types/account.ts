export interface Identity {
  entity: string
  fingerprint: string
  username: string
  name: string
}

export interface Session {
  code: string
  address: string
  agent: string
  created: number
  accessed: number
  expires: number
}

export interface AccountData {
  identity: Identity
  sessions: Session[]
}

export interface SessionsResponse {
  sessions: Session[]
}
