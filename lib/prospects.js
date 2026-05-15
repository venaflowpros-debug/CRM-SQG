import { supabase } from './supabase.js'

const LEGACY_STORAGE_KEY = 'se_prospection_crm_v1'

/** @param {Record<string, unknown>} row */
export function rowToProspect(row) {
  return {
    id: row.id,
    company: row.company || '',
    sector: row.sector || '',
    address: row.address || '',
    phone: row.phone || '',
    hasWebsite: row.has_website || 'non',
    needs: Array.isArray(row.needs) ? row.needs : [],
    status: row.status || 'non_contacte',
    notes: row.notes || '',
    reminderDate: row.reminder_date ? String(row.reminder_date).slice(0, 10) : '',
    callNotes: Array.isArray(row.call_notes) ? row.call_notes : [],
    dateAdded: row.date_added || row.created_at || new Date().toISOString(),
    assigned: row.assigned || ''
  }
}

/** @param {Record<string, unknown>} p */
export function prospectToRow(p) {
  const row = {
    company: p.company,
    sector: p.sector,
    address: p.address,
    phone: p.phone,
    has_website: p.hasWebsite || 'non',
    needs: p.needs || [],
    status: p.status,
    notes: p.notes || '',
    assigned: p.assigned || '',
    call_notes: p.callNotes || []
  }
  if (p.reminderDate && String(p.reminderDate).trim()) {
    row.reminder_date = String(p.reminderDate).trim().slice(0, 10)
  } else {
    row.reminder_date = null
  }
  if (p.dateAdded) row.date_added = p.dateAdded
  return row
}

export async function fetchProspects() {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('date_added', { ascending: false })

  if (error) throw error
  return (data || []).map(rowToProspect)
}

export async function insertProspect(prospect) {
  const row = prospectToRow(prospect)
  const { data, error } = await supabase
    .from('prospects')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return rowToProspect(data)
}

export async function updateProspect(id, prospect) {
  const row = prospectToRow(prospect)
  const { data, error } = await supabase
    .from('prospects')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToProspect(data)
}

export async function deleteProspectById(id) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw error
}

/** Migration unique depuis localStorage vers Supabase */
export async function migrateFromLocalStorage() {
  let raw
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  } catch {
    return 0
  }
  if (!raw) return 0

  let legacy
  try {
    legacy = JSON.parse(raw)
  } catch {
    return 0
  }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0

  const existing = await fetchProspects()
  if (existing.length > 0) return 0

  for (const p of legacy) {
    const prospect = {
      company: p.company,
      sector: p.sector,
      address: p.address,
      phone: p.phone,
      hasWebsite: p.hasWebsite,
      needs: p.needs || [],
      status: p.status,
      notes: p.notes || '',
      reminderDate: p.reminderDate || '',
      callNotes: Array.isArray(p.callNotes) ? p.callNotes : [],
      dateAdded: p.dateAdded || new Date().toISOString(),
      assigned: p.assigned || ''
    }
    await insertProspect(prospect)
  }

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }

  return legacy.length
}
