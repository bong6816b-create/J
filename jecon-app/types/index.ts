// ============================================================
// TypeScript 타입 정의
// ============================================================

export interface Company {
  id: string
  name: string
  owner_id: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface Site {
  id: string
  company_id: string
  name: string
  client?: string
  address?: string
  start_date?: string
  end_date?: string
  contract_amount: number
  status: 'active' | 'completed' | 'paused'
  share_token?: string
  created_at: string
}

export interface Worker {
  id: string
  company_id: string
  name: string
  role?: string
  nationality: string
  daily_rate: number
  phone?: string
  email?: string
  qr_code: string
  visa_type?: string
  visa_expire?: string
  visa_regnum?: string
  created_at: string
}

export interface DailyLog {
  id: string
  site_id: string
  log_date: string
  weather?: string
  work_type?: string
  progress: number
  note?: string
  kr_workers: number
  fo_workers: number
  created_by?: string
  created_at: string
}

export interface Attendance {
  id: string
  worker_id: string
  log_id?: string
  site_id?: string
  att_date: string
  check_in?: string
  days: number
  sig_url?: string
  signed_at?: string
  created_at: string
  worker?: Worker
}

export interface Material {
  id: string
  log_id: string
  name: string
  spec?: string
  qty?: number
  unit?: string
  unit_price: number
  created_at: string
}

export interface EquipmentUsage {
  id: string
  log_id: string
  name: string
  spec?: string
  qty: number
  hours: number
  unit_price: number
  created_at: string
}

export interface SitePhoto {
  id: string
  log_id?: string
  site_id?: string
  photo_url: string
  work_type?: string
  location?: string
  lat?: number
  lng?: number
  taken_at: string
}

export interface TBMRecord {
  id: string
  site_id: string
  tbm_date: string
  content?: string
  language: string
  created_at: string
}

export interface TBMSignature {
  id: string
  tbm_id: string
  worker_id?: string
  sig_url?: string
  signed_at: string
  worker?: Worker
}

export interface RiskItem {
  hazard: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  measure: string
}

export interface RiskAssessment {
  id: string
  site_id: string
  work_type: string
  eval_date?: string
  evaluator?: string
  items: RiskItem[]
  created_at: string
}

export interface SafetyIssue {
  id: string
  site_id: string
  issue_type?: string
  issue_date?: string
  location?: string
  description?: string
  status: string
  assigned_to?: string
  resolved_at?: string
  created_at: string
}

export interface Contract {
  id: string
  worker_id?: string
  site_id?: string
  start_date?: string
  end_date?: string
  daily_wage?: number
  work_hours?: string
  work_place?: string
  task?: string
  employer?: string
  emp_sig_url?: string
  worker_sig_url?: string
  created_at: string
  worker?: Worker
}

export interface GanttItem {
  id: string
  site_id: string
  name: string
  start_date?: string
  end_date?: string
  progress: number
  person?: string
  created_at: string
}

export interface StockRecord {
  id: string
  site_id?: string
  record_date?: string
  name: string
  record_type: 'in' | 'out'
  qty?: number
  unit?: string
  unit_price: number
  note?: string
  created_at: string
}

export interface InsuranceResult {
  pension: number
  health: number
  ltcare: number
  employ: number
  income: number
  local: number
  total: number
  net: number
}

export interface DashboardStats {
  todayWorkers: number
  activeSites: number
  monthlyCost: number
  openIssues: number
}
