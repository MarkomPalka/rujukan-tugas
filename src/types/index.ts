export type SourceStatus = 'recommended' | 'to_read' | 'reading' | 'used' | 'dismissed'

export type SourceCategory =
  | 'theory'
  | 'case_study'
  | 'methodology'
  | 'gap_fill'
  | 'existing'
  | 'general'

export interface Source {
  id: string
  title: string
  authors: string[]
  year?: number
  abstract?: string
  summary?: string
  doi?: string
  url?: string
  openAccessUrl?: string
  type: 'journal' | 'book' | 'other'
  language?: string
  relevanceScore?: number
  relevanceReason?: string
  citationCount?: number
  credibility?: 'tinggi' | 'sedang' | 'rendah'
  category: SourceCategory
  status: SourceStatus
  citationApa?: string
  addedAt: number
  sourceApi?: 'openalex' | 'semantic_scholar' | 'manual'
}

export type WorkflowStep = 'brief' | 'direction' | 'draft' | 'sources'

export interface Project {
  id: string
  title: string
  brief: string
  direction: string
  draft: string
  keywords: string[]
  workflowStep?: WorkflowStep
  createdAt: number
  updatedAt: number
  sources: Source[]
  lastSearchAt?: number
}

export const WORKFLOW_STEPS: { id: WorkflowStep; label: string; description: string }[] = [
  { id: 'brief', label: 'Brief Tugas', description: 'Instruksi dari dosen' },
  { id: 'direction', label: 'Arah Tulisan', description: 'Argumen & sudut pandang' },
  { id: 'draft', label: 'Draft Tulisan', description: 'Opsional' },
  { id: 'sources', label: 'Sumber & Pencarian', description: 'Lengkapi & cari rujukan' },
]

export interface SearchQuery {
  terms: string[]
  brief: string
  direction: string
  draft: string
  existingTitles: string[]
}

export interface CurationGroup {
  category: SourceCategory
  label: string
  description: string
  sources: Source[]
}

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  theory: 'Teori & Kerangka Konsep',
  case_study: 'Studi Kasus Serupa',
  methodology: 'Metodologi & Pendekatan',
  gap_fill: 'Perkuat Gap di Draft',
  existing: 'Sumber yang Kamu Punya',
  general: 'Rekomendasi Umum',
}

export const STATUS_LABELS: Record<SourceStatus, string> = {
  recommended: 'Rekomendasi',
  to_read: 'Perlu Dibaca',
  reading: 'Sedang Dibaca',
  used: 'Dipakai di Esai',
  dismissed: 'Diabaikan',
}
