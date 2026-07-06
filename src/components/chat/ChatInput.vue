<template>
  <div class="chat-input-wrapper">
    <el-input
      v-model="inputValue"
      type="textarea"
      :rows="2"
      :disabled="disabled"
      placeholder="输入您的问题..."
      resize="none"
      @keydown.enter.exact.prevent="handleSend"
    />
    
    <div class="input-actions">
      <span class="tip">按 Enter 发送，Shift + Enter 换行</span>
      <el-button
        type="primary"
        :disabled="disabled || !inputValue.trim()"
        @click="handleSend"
      >
        <el-icon><position /></el-icon>
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Position } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
}>()

const inputValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  inputValue.value = val
})

watch(inputValue, (val) => {
  emit('update:modelValue', val)
})

const handleSend = () => {
  if (inputValue.value.trim() && !props.disabled) {
    emit('send')
  }
}
</script>

<style scoped lang="scss">
.chat-input-wrapper {
  :deep(.el-textarea__inner) {
    padding: 12px;
    font-size: 14px;
    line-height: 1.5;
  }
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  
  .tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>