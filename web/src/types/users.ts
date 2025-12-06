export interface User {
  id: number
  username: string
  role: string
}

export interface UsersData {
  users: User[]
  count: number
}
