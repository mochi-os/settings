export interface Domain {
  domain: string
  entity?: string
  created?: string
}

export interface Delegation {
  domain: string
  path: string
  user: string
  created?: string
}

export interface Route {
  domain: string
  path: string
  entity: string
  priority: number
  context?: string
  created?: string
}

export interface UserDomainsData {
  domains: Domain[]
  delegations: Delegation[]
}

export interface RoutesData {
  routes: Route[]
}
