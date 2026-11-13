<template>
  <div class="member-management">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select
          v-model="selectedKbId"
          placeholder="请选择知识库"
          filterable
          class="kb-select"
          @change="handleKbChange"
        >
          <el-option
            v-for="kb in kbOptions"
            :key="kb.id"
            :label="kb.name"
            :value="kb.id"
          />
        </el-select>
        <el-button @click="fetchMembers" :loading="loading">
          <el-icon :size="16"><Refresh /></el-icon>
          <span>刷新</span>
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button
          v-if="canManage"
          class="add-btn"
          :disabled="selectedKbId === null"
          @click="handleAdd"
        >
          <el-icon :size="16"><Plus /></el-icon>
          <span>添加成员</span>
        </el-button>
        <el-button
          v-if="canManage"
          class="create-btn"
          :disabled="selectedKbId === null"
          @click="handleCreate"
        >
          <el-icon :size="16"><User /></el-icon>
          <span>创建成员</span>
        </el-button>
      </div>
    </div>

    <div class="table-wrapper">
      <el-empty
        v-if="selectedKbId === null"
        description="请先选择要管理的知识库"
        :image-size="120"
      />
      <el-table
        v-else
        :data="members"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="headerCellStyle"
      >
        <el-table-column prop="username" label="用户名" min-width="180">
          <template #default="{ row }">
            <span class="member-name">
              {{ row.username }}
              <el-tag v-if="row.userId === currentUserId" size="small" type="info" class="self-tag">
                我
              </el-tag>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="140" align="center">
          <template #default="{ row }">
            <span :class="['role-tag', `role-${row.role.toLowerCase()}`]">
              {{ roleMap[row.role] || row.role }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="加入时间" min-width="180" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns" v-if="canOperateRow(row)">
              <el-button size="small" @click="handleEditRole(row)">修改角色</el-button>
              <el-button size="small" type="danger" @click="handleRemove(row)">移除</el-button>
            </div>
            <span v-else class="no-action">—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="addDialogVisible"
      title="添加成员"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="目标用户" prop="userId">
          <el-select
            v-model="addForm.userId"
            placeholder="输入用户名搜索"
            filterable
            remote
            :remote-method="handleSearchUsers"
            :loading="userSearchLoading"
            style="width: 100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="u.username"
              :value="u.id"
              :disabled="u.id === currentUserId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="addForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="r in roleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleAddSubmit">确认添加</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createDialogVisible"
      title="创建成员"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="初始密码" prop="password">
          <el-input v-model="createForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="r in roleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleCreateSubmit">确认创建</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="修改成员角色"
      width="420px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="edit-user-info">
        成员：<strong>{{ editForm.username }}</strong>
      </div>
      <el-form label-width="90px" label-position="right">
        <el-form-item label="新角色">
          <el-select v-model="editForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="r in roleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleEditSubmit">保存修改</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, User } from '@element-plus/icons-vue'
import { memberApi } from '@/api/member'
import { knowledgeBaseApi } from '@/api/knowledgeBase'
import type { KnowledgeBaseItem } from '@/types/knowledge-base'
import type { MemberItem, MemberRole, UserSearchItem } from '@/types/member'
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils/format'

const route = useRoute()
const userStore = useUserStore()

const kbOptions = ref<KnowledgeBaseItem[]>([])
const selectedKbId = ref<number | null>(null)
const members = ref<MemberItem[]>([])
const loading = ref(false)

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const submitting = ref(false)
const addFormRef = ref<FormInstance>()

const userOptions = ref<UserSearchItem[]>([])
const userSearchLoading = ref(false)

const addForm = ref<{ userId: number | null; role: MemberRole }>({
  userId: null,
  role: 'VIEWER'
})

const editForm = ref<{ userId: number | null; username: string; role: MemberRole }>({
  userId: null,
  username: '',
  role: 'VIEWER'
})

const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = ref<{ username: string; password: string; role: MemberRole; email: string }>({
  username: '',
  password: '',
  role: 'VIEWER',
  email: ''
})

const roleMap: Record<MemberRole, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  EDITOR: '编辑者',
  VIEWER: '只读者'
}

const addFormRules: FormRules = {
  userId: [{ required: true, message: '请选择目标用户', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const createFormRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const headerCellStyle = {
  background: '#f8fafc',
  color: '#64748b',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #e2e8f0'
}

const currentUserId = computed(() => userStore.user?.userId)

const currentRole = computed<MemberRole | undefined>(() => {
  return members.value.find((m) => m.userId === currentUserId.value)?.role
})

const canManage = computed(() => {
  return currentRole.value === 'OWNER' || currentRole.value === 'ADMIN'
})

const canAssignOwner = computed(() => currentRole.value === 'OWNER')

const roleOptions = computed(() => {
  const all = [
    { value: 'OWNER' as MemberRole, label: '所有者' },
    { value: 'ADMIN' as MemberRole, label: '管理员' },
    { value: 'EDITOR' as MemberRole, label: '编辑者' },
    { value: 'VIEWER' as MemberRole, label: '只读者' }
  ]
  return canAssignOwner.value ? all : all.filter((r) => r.value !== 'OWNER')
})

const canOperateRow = (row: MemberItem) => {
  if (!canManage.value) return false
  if (row.role === 'OWNER' && !canAssignOwner.value) return false
  return true
}

const fetchKbOptions = async () => {
  try {
    kbOptions.value = await knowledgeBaseApi.getList()
  } catch {
    kbOptions.value = []
  }
}

const fetchMembers = async () => {
  if (selectedKbId.value === null) {
    members.value = []
    return
  }
  loading.value = true
  try {
    members.value = await memberApi.getMembers(selectedKbId.value)
  } catch {
    members.value = []
  } finally {
    loading.value = false
  }
}

const handleKbChange = () => {
  fetchMembers()
}

const handleSearchUsers = async (keyword: string) => {
  if (!keyword || !keyword.trim()) {
    userOptions.value = []
    return
  }
  userSearchLoading.value = true
  try {
    userOptions.value = await memberApi.searchUsers(keyword.trim())
  } catch {
    userOptions.value = []
  } finally {
    userSearchLoading.value = false
  }
}

const handleAdd = () => {
  addForm.value = { userId: null, role: 'VIEWER' }
  userOptions.value = []
  addDialogVisible.value = true
  nextTick(() => {
    addFormRef.value?.clearValidate()
  })
}

const handleAddSubmit = async () => {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid || selectedKbId.value === null || addForm.value.userId === null) return

  submitting.value = true
  try {
    await memberApi.addMember(selectedKbId.value, {
      userId: addForm.value.userId,
      role: addForm.value.role
    })
    ElMessage.success('成员添加成功')
    addDialogVisible.value = false
    fetchMembers()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleCreate = () => {
  createForm.value = { username: '', password: '', role: 'VIEWER', email: '' }
  createDialogVisible.value = true
  nextTick(() => {
    createFormRef.value?.clearValidate()
  })
}

const handleCreateSubmit = async () => {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid || selectedKbId.value === null) return

  submitting.value = true
  try {
    await memberApi.createMember(selectedKbId.value, {
      username: createForm.value.username,
      password: createForm.value.password,
      role: createForm.value.role,
      email: createForm.value.email || undefined
    })
    ElMessage.success('成员创建成功')
    createDialogVisible.value = false
    fetchMembers()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleEditRole = (row: MemberItem) => {
  editForm.value = {
    userId: row.userId,
    username: row.username,
    role: row.role
  }
  editDialogVisible.value = true
}

const handleEditSubmit = async () => {
  if (selectedKbId.value === null || editForm.value.userId === null) return

  submitting.value = true
  try {
    await memberApi.updateMemberRole(selectedKbId.value, editForm.value.userId, {
      role: editForm.value.role
    })
    ElMessage.success('角色修改成功')
    editDialogVisible.value = false
    fetchMembers()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleRemove = async (row: MemberItem) => {
  if (selectedKbId.value === null) return
  try {
    await ElMessageBox.confirm(`确定要移除成员「${row.username}」吗？`, '移除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await memberApi.removeMember(selectedKbId.value, row.userId)
    ElMessage.success('成员移除成功')
    fetchMembers()
  } catch {
    // 取消移除
  }
}

onMounted(async () => {
  await fetchKbOptions()
  const queryKbId = Number(route.query.kbId)
  if (queryKbId && kbOptions.value.some((kb) => kb.id === queryKbId)) {
    selectedKbId.value = queryKbId
    fetchMembers()
  }
})
</script>

<style scoped lang="scss">
.member-management {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.kb-select {
  width: 280px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-btn {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #3b82f6;

  &:hover {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #2563eb;
  }
}

.create-btn {
  background: #ecfdf5;
  border-color: #6ee7b7;
  color: #059669;

  &:hover {
    background: #d1fae5;
    border-color: #34d399;
    color: #047857;
  }
}

.table-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;

  :deep(.el-table) {
    --el-table-border-color: #e2e8f0;
  }

  :deep(.el-table th) {
    border-right: none;
  }

  :deep(.el-table td) {
    border-right: none;
  }

  :deep(.el-table__row:hover > td) {
    background: #f8fafc !important;
  }
}

.member-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .self-tag {
    margin-left: 4px;
  }
}

.role-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 4px;

  &.role-owner {
    background: #f5f3ff;
    color: #7c3aed;
  }

  &.role-admin {
    background: #eff6ff;
    color: #2563eb;
  }

  &.role-editor {
    background: #ecfdf5;
    color: #059669;
  }

  &.role-viewer {
    background: #f1f5f9;
    color: #64748b;
  }
}

.action-btns {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.no-action {
  color: #cbd5e1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-user-info {
  margin-bottom: 16px;
  font-size: 14px;
  color: #334155;
}
</style>