import apiClient from './index'
import type {
  MemberItem,
  UserSearchItem,
  AddMemberRequest,
  CreateMemberRequest,
  UpdateMemberRoleRequest
} from '@/types/member'

export const memberApi = {
  searchUsers: (keyword: string): Promise<UserSearchItem[]> => {
    return apiClient.get('/users/search', { params: { keyword } })
  },

  getMembers: (kbId: number): Promise<MemberItem[]> => {
    return apiClient.get(`/knowledge-bases/${kbId}/members`)
  },

  addMember: (kbId: number, data: AddMemberRequest): Promise<null> => {
    return apiClient.post(`/knowledge-bases/${kbId}/members`, data)
  },

  createMember: (kbId: number, data: CreateMemberRequest): Promise<null> => {
    return apiClient.post(`/knowledge-bases/${kbId}/members/create`, data)
  },

  updateMemberRole: (kbId: number, userId: number, data: UpdateMemberRoleRequest): Promise<null> => {
    return apiClient.put(`/knowledge-bases/${kbId}/members/${userId}`, data)
  },

  removeMember: (kbId: number, userId: number): Promise<null> => {
    return apiClient.delete(`/knowledge-bases/${kbId}/members/${userId}`)
  }
}