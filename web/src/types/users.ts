export interface User {
  id: number
  username: string
  role: string
  status: 'active' | 'suspended'
  methods: string
  mfa_required: boolean
  last_login: number | null
}

export interface Session {
  code: string
  expires: number
  created: number
  accessed: number
  address: string
  agent: string
}

export interface UsersData {
  users: User[]
  count: number
}

export interface SessionsData {
  sessions: Session[]
}
