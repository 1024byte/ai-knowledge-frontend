<template>
  <div class="placeholder-page">
    <el-result icon="success" title="系统首页" sub-title="欢迎使用 AI 智能知识库系统">
      <template #extra>
        <el-button type="primary" @click="$router.push('/knowledge-management')">
          进入知识库管理
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped lang="scss">
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
</style>