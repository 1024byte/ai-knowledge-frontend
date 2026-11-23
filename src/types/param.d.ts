/**
 * 参数管理相关类型
 * 接口文档：doc/API-FRONTEND-GUIDE.md
 */

/** 参数数据类型 */
export type ParamType = 'INT' | 'DOUBLE' | 'BOOLEAN' | 'STRING'

/** 操作动作 */
export type ParamAction = 'SAVE' | 'APPLY' | 'ROLLBACK' | 'RESET'

/** 参数列表项（GET /api/params） */
export interface ParamItemVO {
  /** 参数键 */
  paramKey: string
  /** 中文名 */
  paramName: string
  /** 类型：INT / DOUBLE / BOOLEAN / STRING */
  paramType: ParamType
  /** 元数据默认值 */
  defaultValue: string
  /** 最小值（数值型） */
  minValue: string | null
  /** 最大值（数值型） */
  maxValue: string | null
  /** 分类：检索 / 精排 / 降权 */
  category: string
  /** 参数说明 */
  description: string
  /** 展示排序 */
  sortOrder: number
  /** 本作用域已应用值（无覆盖则为 null） */
  appliedValue: string | null
  /** 本作用域草稿值（无草稿则为 null） */
  draftValue: string | null
  /** 生效值（KB 覆盖 > 全局已应用 > 元数据默认值） */
  effectiveValue: string
}

/** 操作历史记录（GET /api/params/history） */
export interface ParamHistory {
  /** 历史记录 ID */
  id: number
  /** 参数键 */
  paramKey: string
  /** 作用域类型：GLOBAL / KB */
  scopeType: 'GLOBAL' | 'KB'
  /** 知识库 ID（GLOBAL 为 null） */
  kbId: number | null
  /** 变更前值 */
  oldValue: string | null
  /** 变更后值 */
  newValue: string | null
  /** 动作：SAVE / APPLY / ROLLBACK / RESET */
  action: ParamAction
  /** 操作人 ID */
  operatorId: number
  /** 操作人姓名 */
  operatorName: string
  /** 操作时间（ISO-8601 本地时间） */
  operateTime: string
}

/** 保存草稿请求体 */
export interface ParamSaveRequest {
  /** 知识库 ID；null = 全局作用域 */
  kbId?: number | null
  /** 参数键 */
  paramKey: string
  /** 参数值（字符串，后端按类型/范围校验） */
  paramValue: string
}

/** 应用 / 回退单个参数请求体 */
export interface ParamSingleRequest {
  /** 知识库 ID；null = 全局作用域 */
  kbId?: number | null
  /** 参数键 */
  paramKey: string
}

/** 重置作用域请求体 */
export interface ParamResetRequest {
  /** 知识库 ID；null = 重置全局作用域 */
  kbId?: number | null
}