export interface SystemDomain {
  domain: string
  verified: number
  token: string
  tls: number
  created: number
  updated: number
}

export interface SystemDomainsData {
  domains: SystemDomain[]
  count: number
}

export interface SystemRoute {
  domain: string
  path: string
  entity: string
  context: string
  priority: number
  enabled: number
  created: number
  updated: number
}

export interface SystemDelegation {
  id: number
  domain: string
  path: string
  owner: number
  created: number
  updated: number
}

export interface SystemDomainDetails {
  domain: SystemDomain
  routes: SystemRoute[]
  delegations: SystemDelegation[]
}
