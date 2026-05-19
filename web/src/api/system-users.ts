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
  search: string,
  sort: string,
  order: string
): Promise<SystemUsersResponse> => {
  const response = await requestHelpers.post<SystemUsersResponse>(
    endpoints.system.usersList,
    { limit, offset, search, sort, order }
  )
  return response
}

const getSessions = async (uid: string): Promise<SystemUserSessionsResponse> => {
  const response = await requestHelpers.post<SystemUserSessionsResponse>(
    endpoints.system.usersSessions,
    { uid }
  )
  return response
}

export const systemUsersApi = {
  list,
  getSessions,
}
