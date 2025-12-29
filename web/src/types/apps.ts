export interface AppInfo {
  id: string
  fingerprint: string
  version: string
  versions: string[]
  label: string
  paths: string[]
  classes: string[]
  services: string[]
}

export interface AppsListData {
  apps: AppInfo[]
}

export interface AppDetailData {
  app: string
  versions: string[]
  tracks: Record<string, string>
  default: {
    version: string
    track: string
  } | null
}

export interface AppsAvailableData {
  available: boolean
  version: string
}

export interface AppsRoutingData {
  classes: Record<string, string>
  services: Record<string, string>
  paths: Record<string, string>
}
