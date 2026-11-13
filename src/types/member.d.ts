export type MemberRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'

export interface UserSearchItem {
  id: number
  username: string
}

export interface MemberItem {
  memberId: number
  userId: number
  username: string
  role: MemberRole
  createdAt: string
}

export interface AddMemberRequest {
  userId: number
  role: MemberRole
}

export interface CreateMemberRequest {
  username: string
  password: string
  role: MemberRole
  email?: string
}

export interface UpdateMemberRoleRequest {
  role: MemberRole
}