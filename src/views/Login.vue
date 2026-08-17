<template>
  <div class="login-page">
    <div class="bg-orbs" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="login-card">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="brand">
          <div class="brand-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path d="M8 22V10l8 6-8 6z" fill="#fff" opacity="0.9" />
              <path d="M16 22V10l8 6-8 6z" fill="#fff" opacity="0.6" />
            </svg>
          </div>
          <h1 class="brand-title">RAG 知识库</h1>
          <p class="brand-subtitle">AI 驱动的知识管理平台</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              size="large"
              class="custom-input"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              size="large"
              class="custom-input"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="form.remember" class="remember-checkbox">
              记住密码
            </el-checkbox>
          </div>

          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            size="large"
            class="submit-btn"
          >
            登录
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, type FormInstance, type FormRules } from "element-plus"
import { User, Lock } from "@element-plus/icons-vue"
import { authApi } from "@/api/auth"
import { setToken, setRefreshToken, setDeviceId, getDeviceId, clearAuth } from "@/utils/auth"
import { useUserStore } from "@/stores/user"

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: "",
  password: "",
  remember: false
})

const validateUsername = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error("请输入用户名"))
  } else {
    callback()
  }
}

const validatePassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error("请输入密码"))
  } else if (value.length < 6) {
    callback(new Error("密码至少 6 位"))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [{ validator: validateUsername, trigger: "blur" }],
  password: [{ validator: validatePassword, trigger: "blur" }]
}

onMounted(() => {
  const savedUsername = localStorage.getItem("kb_username")
  const savedRemember = localStorage.getItem("kb_remember")
  if (savedUsername) {
    form.username = savedUsername
    if (savedRemember === "true") {
      form.remember = true
      const savedPassword = localStorage.getItem("kb_password")
      if (savedPassword) {
        form.password = savedPassword
      }
    }
  }
})

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const res = await authApi.login({
        username: form.username,
        password: form.password,
        deviceId: getDeviceId()
      })

      setToken(res.accessToken)
      setRefreshToken(res.refreshToken)
      setDeviceId(res.deviceId)
      localStorage.removeItem("knowledge_base_session_id")
      userStore.saveUser({
        userId: res.userId,
        username: res.username,
        role: res.role
      })

      if (form.remember) {
        localStorage.setItem("kb_username", form.username)
        localStorage.setItem("kb_password", form.password)
        localStorage.setItem("kb_remember", "true")
      } else {
        localStorage.removeItem("kb_username")
        localStorage.removeItem("kb_password")
        localStorage.removeItem("kb_remember")
      }

      ElMessage.success("登录成功")
      router.push("/")
    } catch {
      ElMessage.error("用户名或密码错误")
    } finally {
      loading.value = false
    }
  })
}
</script>
<style scoped lang="scss">
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f7;
  overflow: hidden;
  padding: 24px;
}

.bg-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.orb-1 {
  width: 420px;
  height: 420px;
  background: #818cf8;
  top: -10%;
  right: -5%;
  animation-name: drift-1;
  animation-duration: 18s;
}

.orb-2 {
  width: 320px;
  height: 320px;
  background: #6366f1;
  bottom: -8%;
  left: -5%;
  animation-name: drift-2;
  animation-duration: 22s;
}

.orb-3 {
  width: 260px;
  height: 260px;
  background: #a5b4fc;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-name: drift-3;
  animation-duration: 20s;
}

@keyframes drift-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-40px, 30px) scale(1.08); }
}

@keyframes drift-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -20px) scale(1.05); }
}

@keyframes drift-3 {
  0% { transform: translate(-50%, -50%) scale(1); }
  100% { transform: translate(-50%, -50%) scale(1.12); }
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.06),
    0 20px 48px rgba(15, 23, 42, 0.04);
  z-index: 1;
}

.card-accent {
  height: 4px;
  background: linear-gradient(90deg, #6366f1, #818cf8, #6366f1);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.card-body {
  padding: 40px 36px 36px;
}

.brand {
  text-align: center;
  margin-bottom: 36px;
}

.brand-icon {
  margin-bottom: 16px;
  display: inline-block;
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
  margin: 0 0 6px;
}

.brand-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
  font-weight: 400;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}

.custom-input {
  :deep(.el-input__wrapper) {
    background: #f8f9fb;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    padding: 0 12px;

    &:hover {
      border-color: #c7d2fe;
    }

    &.is-focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }

  :deep(.el-input__prefix) {
    color: #94a3b8;
    margin-right: 4px;
  }

  :deep(.el-input__inner) {
    color: #0f172a;
    font-size: 15px;
    height: 46px;
    line-height: 46px;

    &::placeholder {
      color: #94a3b8;
    }
  }

  :deep(.el-input__suffix) {
    color: #94a3b8;
  }
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.remember-checkbox {
  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: #64748b;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background-color: #6366f1;
    border-color: #6366f1;
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #6366f1;
  }

  :deep(.el-checkbox__inner) {
    border-radius: 4px;
  }
}

.submit-btn {
  width: 100%;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 8px;
  background: #6366f1;
  border-color: #6366f1;

  &:hover {
    background: #4f46e5;
    border-color: #4f46e5;
  }

  &:active {
    background: #4338ca;
    border-color: #4338ca;
  }

  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 16px;
    align-items: flex-start;
    padding-top: 60px;
  }

  .card-body {
    padding: 32px 24px 28px;
  }

  .brand-title {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb {
    animation: none;
  }
  .card-accent {
    animation: none;
  }
}
</style>