import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import endpoints from '@/api/endpoints'
import type { UsersData, User } from '@/types/users'

export function useSystemUsersData(limit = 100, offset = 0) {
  return useQuery({
    queryKey: ['system', 'users', limit, offset],
    queryFn: async () => {
      const response = await apiClient.get<UsersData>(endpoints.system.users, {
        params: { limit, offset },
      })
      return response.data
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { username: string; role: string }) => {
      const response = await apiClient.post<User>(endpoints.system.usersCreate, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { id: number; username?: string; role?: string }) => {
      const response = await apiClient.post(endpoints.system.usersUpdate, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(endpoints.system.usersDelete, { id })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] })
    },
  })
}
