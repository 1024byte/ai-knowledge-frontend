<template>
  <div class="recall-test">
    <aside class="control-panel">
      <div class="panel-header">
        <h2 class="panel-title">召回测试</h2>
        <p class="panel-subtitle">配置检索范围与策略，验证知识片段召回命中效果</p>
      </div>

      <div class="panel-body">
        <div class="form-section">
          <div class="form-section-label">测试范围</div>
          <el-select
            v-model="selectedKbs"
            class="full-width"
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            :loading="kbLoading"
            placeholder="选择知识库"
          >
            <el-option
              v-for="kb in knowledgeBases"
              :key="kb.id"
              :label="kb.name"
              :value="kb.id"
            />
          </el-select>

          <el-select
            v-model="selectedDocs"
            class="full-width"
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            :loading="docLoading"
            :disabled="selectedKbs.length === 0"
            :placeholder="selectedKbs.length ? '选择文档' : '请先选择知识库'"
          >
            <el-option
              v-for="doc in documents"
              :key="doc.id"
              :label="doc.fileName"
              :value="doc.id"
            />
          </el-select>
        </div>

        <div class="form-section">
          <div class="form-section-label">检索策略</div>
          <el-radio-group v-model="strategy" class="strategy-group">
            <el-radio-button
              v-for="opt in strategyOptions"
              :key="opt.value"
              :label="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="form-section">
          <div class="form-section-label">
            <span>排除关键词</span>
          </div>
          <el-select
            v-model="excludeKeywords"
            class="full-width"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            :reserve-keyword="false"
            placeholder="输入关键词后回车添加（可选）"
          >
            <el-option
              v-for="kw in excludeKeywords"
              :key="kw"
              :label="kw"
              :value="kw"
            />
          </el-select>
        </div>

        <div class="form-section">
          <div class="form-section-label">
            <span>高级参数</span>
            <span class="label-actions">
              <el-button class="reset-btn" text size="small" type="primary" @click="loadEffectiveParams">读取生效参数</el-button>
              <el-button class="reset-btn" text size="small" type="primary" @click="resetParams">恢复默认</el-button>
            </span>
          </div>
          <div class="param-row">
            <span class="param-name">
              Top-K
              <el-tooltip content="召回返回的片段数量，值越大召回越多，但也可能引入更多噪声" placement="top">
                <el-icon class="param-tip"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-input-number
              v-model="topK"
              :min="1"
              :max="50"
              :step="1"
              size="small"
              controls-position="right"
              class="param-number"
            />
          </div>
          <div class="param-row">
            <span class="param-name">
              相似度阈值
              <el-tooltip content="低于该相似度分数的片段将被过滤，用于平衡召回与精确率" placement="top">
                <el-icon class="param-tip"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <span class="param-value">{{ threshold.toFixed(2) }}</span>
          </div>
          <el-slider
            v-model="threshold"
            :min="0"
            :max="1"
            :step="0.01"
            :format-tooltip="(val: number) => val.toFixed(2)"
            class="threshold-slider"
          />

          <div v-if="strategy === 'hybrid'" class="fusion-settings">
            <div class="fusion-settings-title">融合算法设置</div>
            <div class="param-row">
              <span class="param-name">
                RRF 平滑系数 K
                <el-tooltip content="RRF 融合排序中的平滑系数，K 越小排名靠前的结果权重越高" placement="top">
                  <el-icon class="param-tip"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
              <el-select v-model="rrfKMode" size="small" class="rrf-select">
                <el-option
                  v-for="opt in rrfKOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
            <div v-if="rrfKMode === 'custom'" class="rrf-custom">
              <el-input-number
                v-model="rrfKCustom"
                :min="1"
                :max="1000"
                :step="1"
                size="small"
                controls-position="right"
                class="param-number"
              />
            </div>
          </div>

          <div class="rerank-settings">
            <div class="rerank-settings-title">重排序设置</div>
            <div class="param-row">
              <span class="param-name">
                启用 Rerank
                <el-tooltip content="对召回结果调用重排序模型进行精排，hybrid / vector / bm25 三种策略均生效" placement="top">
                  <el-icon class="param-tip"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
              <el-switch v-model="enableRerank" size="small" />
            </div>
            <div class="param-row">
              <span class="param-name">
                Rerank 阈值 (logits)
                <el-tooltip content="Rerank 模型 logits 分数阈值，值越大越严格（保留越少），越小越宽松（保留越多）。建议范围 -20 ~ 20" placement="top">
                  <el-icon class="param-tip"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
              <el-input-number
                v-model="rerankThreshold"
                :min="-100"
                :max="100"
                :step="0.1"
                :precision="2"
                size="small"
                controls-position="right"
                :disabled="!enableRerank"
                class="param-number"
              />
            </div>

            <template v-if="enableRerank">
              <div class="rerank-settings-subtitle">候选池设置</div>
              <div class="param-row">
                <span class="param-name">
                  候选池倍数
                  <el-tooltip content="召回候选数 = Top-K × 倍数，再受候选池上限约束" placement="top">
                    <el-icon class="param-tip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
                <el-input-number
                  v-model="candidateMultiplier"
                  :min="1"
                  :max="10"
                  :step="1"
                  size="small"
                  controls-position="right"
                  class="param-number"
                />
              </div>
              <div class="param-row">
                <span class="param-name">
                  候选池上限
                  <el-tooltip content="候选池最多保留的片段数，精排后再按最终返回数截取" placement="top">
                    <el-icon class="param-tip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
                <el-input-number
                  v-model="maxCandidates"
                  :min="1"
                  :max="500"
                  :step="1"
                  size="small"
                  controls-position="right"
                  class="param-number"
                />
              </div>
              <div class="rerank-max-docs">
                <div class="param-row">
                  <span class="param-name">
                    精排候选上限
                    <el-tooltip content="本次测试覆盖参数管理 rerank.maxDocs，不写库、不影响生产；留空使用参数管理值（默认 30）" placement="top">
                      <el-icon class="param-tip"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                  <el-input-number
                    v-model="rerankMaxDocs"
                    :min="1"
                    :max="300"
                    :step="1"
                    :precision="0"
                    size="small"
                    controls-position="right"
                    placeholder="默认 30"
                    :value-on-clear="null"
                    class="param-number"
                  />
                </div>
                <div class="param-hint">实际精排数 = min(候选池, 该值)，上限 300</div>
              </div>
              <div class="param-row">
                <span class="param-name">
                  最终返回数
                  <el-tooltip content="精排、阈值过滤后返回的片段数，留空时使用 Top-K" placement="top">
                    <el-icon class="param-tip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
                <el-input-number
                  v-model="topN"
                  :min="1"
                  :max="50"
                  :step="1"
                  size="small"
                  controls-position="right"
                  placeholder="同 Top-K"
                  :value-on-clear="null"
                  class="param-number"
                />
              </div>
              <div v-if="strategy === 'hybrid'" class="param-row">
                <span class="param-name">
                  Rerank 阶段
                  <el-tooltip content="融合后精排：先 RRF 融合再精排（默认）；精排后融合：两路各自精排后再 RRF（实验）" placement="top">
                    <el-icon class="param-tip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
                <el-select v-model="rerankStage" size="small" class="rrf-select">
                  <el-option label="融合后精排" value="fuse_rerank" />
                  <el-option label="精排后融合" value="rerank_fuse" />
                </el-select>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <el-button class="start-btn" @click="handleStart">
          <el-icon :size="16"><Search /></el-icon>
          <span>开始测试</span>
        </el-button>
      </div>
    </aside>

    <section class="result-panel">
      <div class="result-header">
        <div class="query-input">
          <div class="form-section-label">测试问题</div>
          <el-input
            v-model="query"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            resize="none"
            placeholder="输入测试问题，例如：什么是向量检索？"
          />
        </div>
        <div class="time-stat">
          <span class="time-value">{{ elapsed }}</span>
          <span class="time-label">总耗时</span>
          <span v-if="timingText" class="time-breakdown">{{ timingText }}</span>
        </div>
      </div>

      <div v-if="hasSearched" class="result-summary">
        <el-tag size="small" type="primary" effect="plain">分数口径：{{ activeScoreMeta.label }}</el-tag>
        <el-tag
          v-if="enableRerank"
          size="small"
          :type="rerankApplied ? 'success' : 'warning'"
          effect="plain"
        >
          {{ rerankApplied ? '已执行精排' : '候选为空，未执行精排' }}
        </el-tag>
        <span class="result-count">共 {{ currentResults.length }} 条</span>
      </div>

      <el-tabs v-model="activeTab" class="result-tabs">
        <el-tab-pane
          v-for="tab in visibleTabs"
          :key="tab.name"
          :label="tab.label"
          :name="tab.name"
        >
          <div v-loading="searching" class="result-body">
            <div v-if="activeTab === 'bm25' && hasResult" class="tokenization-bar">
              <span class="tokenization-label">当前分词</span>
              <span v-for="(token, i) in bm25Tokens" :key="i" class="token-chip">[{{ token }}]</span>
            </div>

            <div v-if="!hasResult" class="result-empty">
              <el-empty
                :description="hasSearched ? '本次未召回任何结果' : '配置参数后点击「开始测试」查看召回结果'"
                :image-size="120"
              />
            </div>

            <div v-else class="result-list">
              <div v-for="(item, index) in currentResults" :key="item.chunkId" class="result-item">
                <div class="result-item-header">
                  <div class="result-item-meta">
                    <span class="result-item-rank">#{{ index + 1 }}</span>
                    <template v-if="activeTab === 'fusion'">
                      <el-tag v-if="item.vectorRank != null" size="small" type="primary" class="source-tag">
                        向量排第{{ item.vectorRank }}
                      </el-tag>
                      <el-tag v-if="item.bm25Rank != null" size="small" type="warning" class="source-tag">
                        BM25排第{{ item.bm25Rank }}
                      </el-tag>
                    </template>
                    <template v-else-if="activeTab === 'rerank'">
                      <el-tag size="small" type="info" class="source-tag">
                        粗排第{{ item.coarseRank }}
                      </el-tag>
                      <el-tag size="small" :type="rankMovement(item).type" class="source-tag">
                        {{ rankMovement(item).icon }} {{ rankMovement(item).text }}
                      </el-tag>
                    </template>
                  </div>
                  <span class="result-item-score">{{ activeScoreMeta.label }} {{ formatScore(item) }}</span>
                </div>
                <div class="result-item-content">
                  <template v-for="(seg, i) in splitHighlight(item.content)" :key="i">
                    <mark v-if="seg.match" class="highlight">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </div>
                <div class="result-item-source">
                  <el-icon :size="14"><Document /></el-icon>
                  <span class="source-label">来源</span>
                  <span class="source-value" :title="`${item.kbName} / ${item.source}`">
                    {{ item.kbName }} / {{ item.source }}
                  </span>
                  <a class="edit-link" @click.prevent="goEdit(item)">前往编辑 &gt;</a>
                </div>
                <div v-if="showScoreBar" class="result-item-bar-wrap">
                  <div class="result-item-bar">
                    <div class="result-item-bar-fill" :style="{ width: Math.min(Math.max(item.score, 0), 1) * 100 + '%' }" />
                  </div>
                  <span class="result-item-bar-score">{{ item.score.toFixed(2) }} / 1.00</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Document, QuestionFilled, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { recallTestApi } from '@/api/recall-test'
import { paramApi } from '@/api/param'
import { knowledgeBaseApi } from '@/api/knowledgeBase'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import type {
  RecallResultItem,
  RecallScoreType,
  RecallTestRequest,
  RerankStage,
  RetrievalStrategy
} from '@/types/recall-test'
import type { KnowledgeBaseItem } from '@/types/knowledge-base'
import type { KnowledgeDocument } from '@/types/knowledge-management'

const query = ref('')
const searchedQuery = ref('')
const selectedKbs = ref<number[]>([])
const selectedDocs = ref<number[]>([])
const strategy = ref<RetrievalStrategy>('hybrid')
const topK = ref(5)
const threshold = ref(0.3)
const rrfKMode = ref('60')
const rrfKCustom = ref(60)
const enableRerank = ref(false)
const rerankThreshold = ref(-4.5)
const candidateMultiplier = ref(3)
const maxCandidates = ref(100)
const rerankMaxDocs = ref<number | null>(null)
const topN = ref<number | null>(null)
const rerankStage = ref<RerankStage>('fuse_rerank')
const excludeKeywords = ref<string[]>([])
const activeTab = ref('final')
const elapsed = ref('--')
const vectorMs = ref<number | null>(null)
const bm25Ms = ref<number | null>(null)
const rerankMs = ref<number | null>(null)
const scoreType = ref<RecallScoreType>('rrf')
const rerankApplied = ref(false)
const hasSearched = ref(false)
const bm25Tokens = ref<string[]>([])
const searching = ref(false)
const knowledgeBases = ref<KnowledgeBaseItem[]>([])
const documents = ref<KnowledgeDocument[]>([])
const kbLoading = ref(false)
const docLoading = ref(false)

const router = useRouter()

const strategyOptions = [
  { label: '混合检索', value: 'hybrid' },
  { label: '仅向量', value: 'vector' },
  { label: '仅 BM25', value: 'bm25' }
]

const rrfKOptions = [
  { label: '默认 (60)', value: '60' },
  { label: '偏向向量 (10)', value: '10' },
  { label: '偏向关键词 (100)', value: '100' },
  { label: '自定义', value: 'custom' }
]

const visibleTabs = computed(() => {
  const tabs = [{ name: 'final', label: '最终结果' }]
  if (strategy.value === 'hybrid') tabs.push({ name: 'fusion', label: '融合结果' })
  if (enableRerank.value) tabs.push({ name: 'rerank', label: '重排结果' })
  if (strategy.value !== 'bm25') tabs.push({ name: 'vector', label: '向量召回' })
  if (strategy.value !== 'vector') tabs.push({ name: 'bm25', label: 'BM25 召回' })
  return tabs
})

watch([strategy, enableRerank], () => {
  const names = visibleTabs.value.map((tab) => tab.name)
  if (!names.includes(activeTab.value)) {
    activeTab.value = 'final'
  }
})

const rrfK = computed(() =>
  rrfKMode.value === 'custom' ? rrfKCustom.value : Number(rrfKMode.value)
)

const loadKnowledgeBases = async () => {
  kbLoading.value = true
  try {
    knowledgeBases.value = await knowledgeBaseApi.getList()
  } catch {
    knowledgeBases.value = []
  } finally {
    kbLoading.value = false
  }
}

const loadDocuments = async () => {
  if (!selectedKbs.value.length) {
    documents.value = []
    selectedDocs.value = []
    return
  }
  docLoading.value = true
  try {
    const pages = await Promise.all(
      selectedKbs.value.map((kbId) =>
        knowledgeManagementApi.getList({ kbId, pageNum: 1, pageSize: 100 })
      )
    )
    documents.value = pages.flatMap((page) => page.records)
  } catch {
    documents.value = []
  } finally {
    docLoading.value = false
    const ids = documents.value.map((doc) => doc.id)
    selectedDocs.value = selectedDocs.value.filter((id) => ids.includes(id))
  }
}

watch(selectedKbs, () => {
  loadDocuments()
})

onMounted(() => {
  loadKnowledgeBases()
})

const results = ref<Record<string, RecallResultItem[]>>({
  final: [],
  fusion: [],
  vector: [],
  bm25: [],
  rerank: []
})

const currentResults = computed(() => results.value[activeTab.value] || [])
const hasResult = computed(() => currentResults.value.length > 0)

const timingText = computed(() => {
  if (elapsed.value === '--') return ''
  const parts: string[] = []
  if (strategy.value !== 'bm25' && vectorMs.value != null) {
    parts.push(`向量: ${vectorMs.value}ms`)
  }
  if (strategy.value !== 'vector' && bm25Ms.value != null) {
    parts.push(`BM25: ${bm25Ms.value}ms`)
  }
  if (rerankApplied.value && rerankMs.value != null) {
    parts.push(`Rerank: ${rerankMs.value}ms`)
  }
  return parts.join(' | ')
})

/** 高亮停用词：问句虚词与语气词，避免整句作为关键词导致无法命中 */
const HIGHLIGHT_STOP_WORDS = new Set([
  '什么', '如何', '怎么', '怎样', '为什么', '哪些', '哪个', '是否', '请问',
  '一下', '介绍', '说明', '告诉', '需要', '帮我',
  '是', '的', '了', '吗', '呢', '和', '与', '及', '或', '在', '有', '我', '你'
])

const normalizeText = (text: string) => text.normalize('NFKC').toLowerCase()

type WordSegmenter = {
  segment: (input: string) => Iterable<{ segment: string; isWordLike?: boolean }>
}
const SegmenterCtor = (
  Intl as unknown as {
    Segmenter?: new (locales?: string | string[], options?: { granularity?: 'word' }) => WordSegmenter
  }
).Segmenter

const highlightTerms = computed(() => {
  const terms = new Set<string>()
  const addTerm = (word: string) => {
    const term = normalizeText(word)
      .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
      .replace(/\s+/g, '')
    if (term.length < 2 || HIGHLIGHT_STOP_WORDS.has(term)) return
    terms.add(term)
  }

  // 1. 优先使用后端分词结果（hybrid / bm25 有值，vector 为空）
  bm25Tokens.value.forEach(addTerm)

  const rawQuery = searchedQuery.value.trim()
  if (!rawQuery) return []

  // 2. 前端分词：按空白切分后，中文按词切分，英文按单词切分
  rawQuery
    .split(/\s+/)
    .filter(Boolean)
    .forEach((segment) => {
      if (SegmenterCtor) {
        const segmenter = new SegmenterCtor('zh', { granularity: 'word' })
        for (const part of segmenter.segment(segment)) {
          if (part.isWordLike) addTerm(part.segment)
        }
      } else {
        addTerm(segment)
      }
    })

  // 3. 兜底：没有可用词项时，对中文连续片段做 2~4 字滑窗
  if (!terms.size) {
    const cjkRuns = normalizeText(rawQuery).match(/[\u4e00-\u9fa5]+/g) ?? []
    for (const run of cjkRuns) {
      for (let size = Math.min(4, run.length); size >= 2; size--) {
        for (let i = 0; i + size <= run.length; i++) {
          terms.add(run.slice(i, i + size))
        }
      }
    }
  }

  // 长词优先，避免短词先命中导致高亮不完整；词项过多时截断
  return Array.from(terms)
    .sort((a, b) => b.length - a.length)
    .slice(0, 20)
})

/** 归一化文本并记录字符到原文的下标映射，使去掉空白后仍能定位原文高亮区间 */
const normalizeWithIndexMap = (raw: string) => {
  let text = ''
  const indexMap: number[] = []
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (/\s/.test(char)) continue
    for (const normalizedChar of char.normalize('NFKC').toLowerCase()) {
      text += normalizedChar
      indexMap.push(i)
    }
  }
  return { text, indexMap }
}

const splitHighlight = (content: string) => {
  const terms = highlightTerms.value
  if (!terms.length) return [{ match: false, text: content }]

  const { text, indexMap } = normalizeWithIndexMap(content)
  if (!text) return [{ match: false, text: content }]

  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(escaped.join('|'), 'g')
  const ranges: Array<[number, number]> = []
  let matched: RegExpExecArray | null
  while ((matched = regex.exec(text)) !== null) {
    const start = indexMap[matched.index]
    const end = indexMap[matched.index + matched[0].length - 1] + 1
    ranges.push([start, end])
  }
  if (!ranges.length) return [{ match: false, text: content }]

  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1])
    } else {
      merged.push([range[0], range[1]])
    }
  }

  const segments: Array<{ match: boolean; text: string }> = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ match: false, text: content.slice(cursor, start) })
    segments.push({ match: true, text: content.slice(start, end) })
    cursor = end
  }
  if (cursor < content.length) segments.push({ match: false, text: content.slice(cursor) })
  return segments
}

const scoreMetaMap: Record<RecallScoreType, { label: string }> = {
  cosine: { label: '相似度' },
  bm25_normalized: { label: 'BM25 归一化' },
  rrf: { label: 'RRF 得分' },
  rerank_logits: { label: '精排 logits' }
}

const activeScoreType = computed<RecallScoreType>(() => {
  if (activeTab.value === 'final') return scoreType.value
  if (activeTab.value === 'bm25') return 'bm25_normalized'
  if (activeTab.value === 'rerank') return 'rerank_logits'
  if (activeTab.value === 'fusion') return 'rrf'
  return 'cosine'
})

const activeScoreMeta = computed(() => scoreMetaMap[activeScoreType.value])

const showScoreBar = computed(
  () => activeScoreType.value === 'cosine' || activeScoreType.value === 'bm25_normalized'
)

const formatScore = (item: RecallResultItem) => {
  if (activeScoreType.value === 'rrf') return item.score.toFixed(4)
  if (activeScoreType.value === 'rerank_logits') return (item.rerankScore ?? 0).toFixed(4)
  return `${(item.score * 100).toFixed(1)}%`
}

const rankMovement = (item: RecallResultItem) => {
  const delta = (item.coarseRank ?? 0) - (item.rerankRank ?? 0)
  if (delta > 0) return { icon: '🔼', text: `上升 ${delta} 名`, type: 'success' }
  if (delta < 0) return { icon: '🔽', text: `下降 ${-delta} 名`, type: 'danger' }
  return { icon: '➖', text: '持平', type: 'info' }
}

const handleStart = async () => {
  if (searching.value) return
  searching.value = true
  try {
    const payload: RecallTestRequest = {
      query: query.value,
      kbIds: selectedKbs.value,
      documentIds: selectedDocs.value,
      strategy: strategy.value,
      topK: topK.value,
      threshold: threshold.value,
      rrfK: rrfK.value,
      enableRerank: enableRerank.value,
      rerankThreshold: rerankThreshold.value,
      excludeKeywords: excludeKeywords.value
    }
    if (enableRerank.value) {
      payload.candidateMultiplier = candidateMultiplier.value
      payload.maxCandidates = maxCandidates.value
      if (rerankMaxDocs.value != null) payload.rerankMaxDocs = rerankMaxDocs.value
      if (topN.value != null) payload.topN = topN.value
      if (strategy.value === 'hybrid') payload.rerankStage = rerankStage.value
    }

    const data = await recallTestApi.run(payload)
    results.value = {
      final: data.results.final ?? [],
      fusion: data.results.fusion ?? [],
      vector: data.results.vector ?? [],
      bm25: data.results.bm25 ?? [],
      rerank: data.results.rerank ?? []
    }
    scoreType.value = data.scoreType
    rerankApplied.value = data.rerankApplied
    searchedQuery.value = data.query || query.value
    hasSearched.value = true
    elapsed.value = `${data.totalMs}ms`
    vectorMs.value = data.vectorMs
    bm25Ms.value = data.bm25Ms
    rerankMs.value = data.rerankMs
    bm25Tokens.value = data.tokens ?? []
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    searching.value = false
  }
}

const goEdit = (item: RecallResultItem) => {
  router.push({
    path: '/knowledge-snippet',
    query: { documentId: item.documentId, chunkId: item.chunkId }
  })
}

const resetParams = () => {
  topK.value = 5
  threshold.value = 0.3
  rrfKMode.value = '60'
  rrfKCustom.value = 60
  enableRerank.value = false
  rerankThreshold.value = -4.5
  candidateMultiplier.value = 3
  maxCandidates.value = 100
  rerankMaxDocs.value = null
  topN.value = null
  rerankStage.value = 'fuse_rerank'
}

const loadEffectiveParams = async () => {
  try {
    const list = await paramApi.getList(null)
    const map = new Map(list.map((p) => [p.paramKey, p.effectiveValue]))
    const get = (key: string, fallback: string) => map.get(key) ?? fallback

    topK.value = Number(get('retrieval.topK', '5'))
    threshold.value = Number(get('retrieval.vectorMinScore', '0.3'))

    const rrfKValue = Number(get('retrieval.rrfK', '60'))
    const preset = rrfKOptions.find((o) => o.value !== 'custom' && Number(o.value) === rrfKValue)
    if (preset) {
      rrfKMode.value = preset.value
    } else {
      rrfKMode.value = 'custom'
      rrfKCustom.value = rrfKValue
    }

    enableRerank.value = get('rerank.enabled', 'false') === 'true'
    rerankThreshold.value = Number(get('rerank.minScore', '-4.5'))

    ElMessage.success('已读取全局生效参数')
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}
</script>

<style scoped lang="scss">
.recall-test {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.control-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  padding: 18px 20px 16px;
  border-bottom: 1px solid #eef2f7;

  .panel-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }

  .panel-subtitle {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: #94a3b8;
  }
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #6366f1;
  }

  .reset-btn {
    margin-left: auto;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: 400;
  }

  .label-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 2px;

    .reset-btn {
      margin-left: 0;
    }
  }
}

.full-width {
  width: 100%;
}

.strategy-group {
  display: flex;
  width: 100%;

  :deep(.el-radio-button) {
    flex: 1;
  }

  :deep(.el-radio-button__inner) {
    width: 100%;
    padding: 9px 0;
  }
}

.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .param-name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #475569;

    .param-tip {
      font-size: 13px;
      color: #94a3b8;
      cursor: help;
    }
  }

  .param-value {
    font-size: 13px;
    font-weight: 600;
    color: #6366f1;
    font-variant-numeric: tabular-nums;
  }
}

.param-number {
  width: 128px;
}

.rerank-max-docs {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .param-hint {
    font-size: 12px;
    line-height: 18px;
    color: #94a3b8;
    text-align: right;
  }
}

.threshold-slider {
  margin: 4px 6px 0;
}

.fusion-settings {
  margin-top: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;

  .fusion-settings-title {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .rrf-select {
    width: 148px;
  }

  .rrf-custom {
    display: flex;
    justify-content: flex-end;
  }
}

.rerank-settings {
  margin-top: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;

  .rerank-settings-title {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .rerank-settings-subtitle {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px dashed #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .rrf-select {
    width: 148px;
  }
}

.panel-footer {
  flex-shrink: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid #eef2f7;

  .start-btn {
    width: 100%;
    height: 44px;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.32);

    &:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
    }
  }
}

.result-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #eef2f7;

  .query-input {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .time-stat {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .time-value {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      color: #6366f1;
      font-variant-numeric: tabular-nums;
    }

    .time-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .time-breakdown {
      font-size: 12px;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }
  }
}

.result-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px 10px;
  border-bottom: 1px solid #eef2f7;

  .result-count {
    margin-left: auto;
    font-size: 12px;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }
}

.result-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 20px;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.result-body {
  height: 100%;
  min-height: 280px;
  overflow-y: auto;
  padding: 6px 0;
}

.result-empty {
  height: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tokenization-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  margin: 4px 0 10px;
  font-size: 12px;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;

  .tokenization-label {
    flex-shrink: 0;
    color: #94a3b8;
  }

  .token-chip {
    color: #64748b;
    background: #f1f5f9;
    padding: 1px 8px;
    border-radius: 6px;
    font-variant-numeric: tabular-nums;
  }
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.result-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.08);
  }

  .result-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;

    .result-item-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    .result-item-rank {
      font-size: 12px;
      font-weight: 600;
      color: #6366f1;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .source-tag {
      font-weight: 500;
      border: none;
    }

    .result-item-score {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 600;
      color: #6366f1;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  }

  .result-item-source {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 12px;
    color: #64748b;

    .el-icon {
      flex-shrink: 0;
      color: #94a3b8;
    }

    .source-label {
      flex-shrink: 0;
      font-weight: 500;
      color: #64748b;
    }

    .source-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #475569;
    }

    .edit-link {
      flex-shrink: 0;
      margin-left: auto;
      font-size: 12px;
      color: #6366f1;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        color: #4f46e5;
      }
    }
  }

  .result-item-content {
    font-size: 13px;
    line-height: 1.7;
    color: #475569;
    word-break: break-word;

    .highlight {
      background: #e0e7ff;
      color: #3730a3;
      padding: 1px 3px;
      border-radius: 4px;
      font-weight: 500;
    }
  }

  .result-item-bar-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }

  .result-item-bar {
    flex: 1;
    height: 4px;
    border-radius: 999px;
    background: #eef2f7;
    overflow: hidden;

    .result-item-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #818cf8 0%, #6366f1 100%);
      transition: width 0.3s ease;
    }
  }

  .result-item-bar-score {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 900px) {
  .recall-test {
    flex-direction: column;
    height: auto;
  }

  .control-panel {
    width: 100%;
  }

  .result-panel {
    min-height: 420px;
  }
}
</style>