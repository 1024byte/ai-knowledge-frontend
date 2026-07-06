# RAG 知识库前端

基于 Vue 3 + TypeScript + Vite 构建的 RAG 知识库前端应用。

## 技术栈

- Vue 3.4+
- TypeScript 5.3+
- Vite 5.0+
- Element Plus 2.5+
- Pinia 2.1+
- Vue Router 4.2+

## 功能特性

### 文档管理
- 支持 .txt、.md、.pdf 格式文档上传
- 文档列表查看
- 文档分类管理
- 文档删除

### 智能问答
- 基于向量检索的智能问答
- 流式响应展示
- Markdown 渲染
- 代码高亮
- 多轮对话
- 对话历史管理

## 快速开始

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 开发模式

```bash
pnpm dev
# 或
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
pnpm build
# 或
npm run build
```

### 预览构建结果

```bash
pnpm preview
# 或
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口
│   ├── assets/           # 静态资源
│   ├── components/       # 组件
│   ├── composables/      # 组合式函数
│   ├── layouts/          # 布局组件
│   ├── router/           # 路由配置
│   ├── stores/           # 状态管理
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面视图
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── public/               # 公共资源
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目配置
```

## 环境变量

### 开发环境 (.env.development)
```
VITE_APP_TITLE=RAG 知识库
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENABLE_MOCK=false
```

### 生产环境 (.env.production)
```
VITE_APP_TITLE=RAG 知识库
VITE_API_BASE_URL=/api/v1
VITE_ENABLE_MOCK=false
```

## API 接口

### 文档接口
- `POST /documents/upload` - 上传文档
- `POST /documents/text` - 添加文本文档
- `GET /documents` - 获取文档列表
- `DELETE /documents/:id` - 删除文档

### 聊天接口
- `POST /chat` - 智能问答
- `GET /chat/stream` - 流式问答

## 后端服务

前端默认连接到 `http://localhost:8080`，请确保后端服务已启动。

后端项目地址：../doc/TDD-LangChain4j-RAG-Knowledge-Base-Tutorial-202607031628.md

## 开发建议

### 代码规范
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 Vue 3 Composition API 最佳实践

### 组件开发
- 组件使用 `<script setup>` 语法
- 使用 TypeScript 类型定义
- 样式使用 Scoped CSS

### 状态管理
- 使用 Pinia 进行状态管理
- 将状态按功能模块划分

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## License

MIT