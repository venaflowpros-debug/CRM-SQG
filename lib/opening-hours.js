export const WEEKDAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' }
]

const DAY_BY_JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function defaultOpeningHours() {
  const hours = {}
  WEEKDAYS.forEach(function (d) {
    hours[d.key] = { open: '09:00', close: '18:00', closed: false }
  })
  return hours
}

export function normalizeOpeningHours(raw) {
  const base = defaultOpeningHours()
  if (!raw || typeof raw !== 'object') return base
  WEEKDAYS.forEach(function (d) {
    if (raw[d.key] && typeof raw[d.key] === 'object') {
      base[d.key] = {
        open: raw[d.key].open || '09:00',
        close: raw[d.key].close || '18:00',
        closed: !!raw[d.key].closed
      }
    }
  })
  return base
}

function timeToMinutes(t) {
  if (!t) return 0
  const parts = String(t).split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10)
}

export function isOpenNow(openingHours) {
  const hours = normalizeOpeningHours(openingHours)
  const now = new Date()
  const key = DAY_BY_JS[now.getDay()]
  const slot = hours[key]
  if (!slot || slot.closed) return false
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= timeToMinutes(slot.open) && nowMins < timeToMinutes(slot.close)
}
