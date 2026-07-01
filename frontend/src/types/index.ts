export interface AssetStatus {
  id: number
  name: string
  color: string
  is_deployable: boolean
  sort_order: number
}

export interface AssetCategory {
  id: number
  name: string
  type: string
  eol_years: number | null
  color: string | null
}

export interface Location {
  id: number
  name: string
  address: string | null
  parent_id: number | null
}

export interface LocationTree extends Location {
  children: LocationTree[]
}

export interface Person {
  id: number
  name: string
  email: string | null
  phone: string | null
  department: string | null
  employee_id: string | null
  location_id: number | null
  location_name: string | null
  notes: string | null
  is_active: boolean
  created_at: string | null
  asset_count: number
}

export interface PersonBrief {
  id: number
  name: string
  department: string | null
  email: string | null
}

export interface Asset {
  id: number
  name: string
  asset_tag: string
  serial: string | null
  make: string | null
  model: string | null
  model_number: string | null
  category_id: number | null
  location_id: number | null
  status_id: number
  assigned_to_id: number | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_months: number | null
  warranty_expiry: string | null
  eol_date: string | null
  supplier: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  status: AssetStatus
  category: AssetCategory | null
  location: Location | null
  assigned_to: PersonBrief | null
  days_to_eol: number | null
  days_to_warranty_expiry: number | null
}

export interface Assignment {
  id: number
  asset_id: number
  asset_name: string
  person_id: number
  person_name: string
  assigned_at: string | null
  released_at: string | null
  note: string | null
  assigned_by_name: string | null
}

export interface SearchAsset {
  id: number
  name: string
  asset_tag: string
  serial: string | null
  status: AssetStatus
  category: AssetCategory | null
  assigned_to: { id: number; name: string } | null
}

export interface SearchPerson {
  id: number
  name: string
  email: string | null
  department: string | null
  asset_count: number
}

export interface SearchNote {
  assignment_id: number
  asset_id: number
  asset_name: string
  person_id: number
  person_name: string
  note: string
  occurred_at: string
}

export interface SearchResults {
  assets: SearchAsset[]
  people: SearchPerson[]
  notes: SearchNote[]
}

export interface DashboardStats {
  total: number
  assigned_count: number
  unassigned_count: number
  total_value: number | null
  by_status: Array<{ status_id: number; name: string; color: string; count: number }>
  by_category: Array<{ category_id: number; name: string; count: number }>
}

export interface Alert {
  type: 'eol' | 'warranty'
  asset_id: number
  asset_name: string
  asset_tag: string
  date: string
  days_remaining: number
}

export interface ActivityItem {
  type: 'assigned' | 'released'
  assignment_id: number
  asset_id: number
  asset_name: string
  person_id: number
  person_name: string
  note: string | null
  occurred_at: string | null
}

export interface AuthUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'viewer'
  is_active?: boolean
}

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: number
  rows: Array<{ row: number; asset_tag?: string; name?: string; status: string; reason?: string }>
}
