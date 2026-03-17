import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import type { Session, UsersData } from '@/types/users'

export type SystemUsersResponse = UsersData

export interface SystemUserSessionsResponse {
  sessions: Session[]
}

const list = async (
  limit: number,
  offset: number,
  search: string
): Promise<SystemUsersResponse> => {
  const response = await requestHelpers.post<SystemUsersResponse>(
    endpoints.system.usersList,
    { limit, offset, search }
  )
  return response
}

const getSessions = async (id: number): Promise<SystemUserSessionsResponse> => {
  const response = await requestHelpers.post<SystemUserSessionsResponse>(
    endpoints.system.usersSessions,
    { id }
  )
  return response
}

export const systemUsersApi = {
  list,
  getSessions,
}
