import {
  fetchProspectById,
  updateProspect,
  subscribeProspectsRealtime,
  rowToProspect
} from './lib/prospects.js'
import { requireAuth, mountAuthUI } from './lib/auth.js'
import {
  WEEKDAYS,
  normalizeOpeningHours,
  isOpenNow
} from './lib/opening-hours.js'

const STATUSES = [
  { id: 'non_contacte', label: 'Non contacté', emoji: '🔴', badge: 'badge-nc' },
  { id: 'appele_attente', label: 'Appelé - En attente', emoji: '🟡', badge: 'badge-aa' },
  { id: 'reponse_positive', label: 'Réponse positive', emoji: '🟢', badge: 'badge-rp' },
  { id: 'reponse_negative', label: 'Réponse négative', emoji: '⚫', badge: 'badge-rn' },
  { id: 'rdv_fixe', label: 'Rendez-vous fixé', emoji: '🔵', badge: 'badge-rdv' }
]

const SECTORS = [
  'Restaurant', 'Coiffeur', 'Garage', 'Boulangerie', 'Médecin', 'Autre'
]

let prospect = null
let prospectId = null
let autosaveTimer = null

const els = {}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatNoteTimestamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return (
    pad2(d.getDate()) +
    '/' +
    pad2(d.getMonth() + 1) +
    '/' +
    d.getFullYear() +
    ' à ' +
    pad2(d.getHours()) +
    'h' +
    pad2(d.getMinutes())
  )
}

function noteUid() {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

function statusById(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0]
}

function hasContractDetailsData(cd) {
  if (!cd || typeof cd !== 'object') return false
  return !!(
    (cd.price != null && cd.price !== '') ||
    cd.delivery ||
    cd.mockup ||
    cd.deadline ||
    cd.rdvDatetime ||
    cd.rdvFormat ||
    (cd.notes && String(cd.notes).trim())
  )
}

function toast(msg) {
  const div = document.createElement('div')
  div.className = 'toast show'
  div.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + escapeHtml(msg)
  els.toasts.appendChild(div)
  setTimeout(() => {
    div.classList.remove('show')
    setTimeout(() => div.remove(), 300)
  }, 2600)
}

function getProspectIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('id')
}

function collectOpeningHoursFromForm() {
  const hours = {}
  WEEKDAYS.forEach((d) => {
    const closed = document.getElementById('oh_closed_' + d.key)
    const open = document.getElementById('oh_open_' + d.key)
    const close = document.getElementById('oh_close_' + d.key)
    hours[d.key] = {
      open: open ? open.value : '09:00',
      close: close ? close.value : '18:00',
      closed: closed ? closed.checked : false
    }
  })
  return hours
}

function collectContractFromForm() {
  return {
    price: els.contractPrice.value.trim()
      ? Number(els.contractPrice.value)
      : null,
    delivery: els.contractDelivery.value,
    mockup: els.contractMockup.value,
    deadline: els.contractDeadline.value.trim(),
    rdvDatetime: els.contractRdvDatetime.value,
    rdvFormat: els.contractRdvFormat.value,
    notes: els.contractNotes.value.trim()
  }
}

function buildProspectFromForm() {
  if (!prospect) return null
  const hw = document.querySelector('input[name="hasWebsite"]:checked')
  return {
    ...prospect,
    company: els.company.value.trim(),
    sector: els.sector.value,
    address: els.address.value.trim(),
    phone: els.phone.value.trim(),
    hasWebsite: hw ? hw.value : 'non',
    assigned: els.assigned.value.trim(),
    notes: els.notes.value.trim(),
    reminderDate: els.reminderDate.value,
    status: els.statusSelect.value,
    openingHours: collectOpeningHoursFromForm(),
    script: els.script.value,
    attentes: els.attentes.value,
    analyse: els.analyse.value,
    instagram: els.instagram.value.trim(),
    facebook: els.facebook.value.trim(),
    websiteUrl: els.websiteUrl.value.trim(),
    contractDetails: collectContractFromForm(),
    callNotes: prospect.callNotes || []
  }
}

async function saveProspect(showToastMsg) {
  if (!prospectId || !prospect) return
  const payload = buildProspectFromForm()
  if (!payload) return
  try {
    prospect = await updateProspect(prospectId, payload)
    syncUIFromProspect()
    if (showToastMsg !== false) toast('✅ Sauvegardé')
  } catch (e) {
    console.error(e)
    toast('Erreur : ' + (e.message || 'sauvegarde impossible'))
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => saveProspect(true), 800)
}

function bindAutosave(el) {
  if (!el) return
  el.addEventListener('blur', scheduleAutosave)
}

function renderOpeningHoursTable(hours) {
  const normalized = normalizeOpeningHours(hours)
  els.openingHoursGrid.innerHTML = WEEKDAYS.map(function (d) {
    const slot = normalized[d.key]
    return (
      '<div class="oh-day">' +
      '<span class="oh-label">' +
      escapeHtml(d.label) +
      '</span>' +
      '<label class="oh-closed-lab"><input type="checkbox" id="oh_closed_' +
      d.key +
      '" ' +
      (slot.closed ? 'checked' : '') +
      ' /> Fermé</label>' +
      '<input class="input oh-time" type="time" id="oh_open_' +
      d.key +
      '" value="' +
      escapeHtml(slot.open) +
      '" />' +
      '<span class="oh-sep">→</span>' +
      '<input class="input oh-time" type="time" id="oh_close_' +
      d.key +
      '" value="' +
      escapeHtml(slot.close) +
      '" />' +
      '</div>'
    )
  }).join('')

  WEEKDAYS.forEach(function (d) {
    const closedCb = document.getElementById('oh_closed_' + d.key)
    const openInp = document.getElementById('oh_open_' + d.key)
    const closeInp = document.getElementById('oh_close_' + d.key)
    function toggleClosed() {
      const dis = closedCb.checked
      openInp.disabled = dis
      closeInp.disabled = dis
      updateOpenBadge()
    }
    closedCb.addEventListener('change', toggleClosed)
    openInp.addEventListener('change', scheduleAutosave)
    closeInp.addEventListener('change', scheduleAutosave)
    bindAutosave(openInp)
    bindAutosave(closeInp)
    toggleClosed()
  })
}

function updateOpenBadge() {
  const hours = collectOpeningHoursFromForm()
  const open = isOpenNow(hours)
  els.openNowBadge.textContent = open ? '🟢 Ouvert maintenant' : '🔴 Fermé'
  els.openNowBadge.className =
    'open-badge ' + (open ? 'open-badge--open' : 'open-badge--closed')
}

function fillContractForm(cd) {
  cd = cd && typeof cd === 'object' ? cd : {}
  els.contractPrice.value =
    cd.price != null && cd.price !== '' ? String(cd.price) : ''
  els.contractDelivery.value = cd.delivery || ''
  els.contractMockup.value = cd.mockup || ''
  els.contractDeadline.value = cd.deadline || ''
  els.contractRdvDatetime.value = cd.rdvDatetime
    ? String(cd.rdvDatetime).slice(0, 16)
    : ''
  els.contractRdvFormat.value = cd.rdvFormat || ''
  els.contractNotes.value = cd.notes || ''
}

function renderCallNotes() {
  const list = (prospect.callNotes || []).slice().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
  if (!list.length) {
    els.callNotesList.innerHTML =
      '<p class="muted">Aucun appel enregistré.</p>'
    return
  }
  els.callNotesList.innerHTML = list
    .map(function (n) {
      return (
        '<div class="call-note-item">' +
        '<div><span class="note-meta">📝 [' +
        formatNoteTimestamp(n.createdAt) +
        ']</span> "' +
        escapeHtml(n.text) +
        '"</div>' +
        '<button type="button" class="btn-icon-sm btn-del-note" data-id="' +
        escapeHtml(n.id) +
        '"><i class="fa-solid fa-trash"></i></button>' +
        '</div>'
      )
    })
    .join('')

  els.callNotesList.querySelectorAll('.btn-del-note').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const nid = btn.getAttribute('data-id')
      prospect.callNotes = (prospect.callNotes || []).filter(
        (n) => n.id !== nid
      )
      await saveProspect(true)
      renderCallNotes()
    })
  })
}

function syncUIFromProspect() {
  if (!prospect) return
  const st = statusById(prospect.status)
  els.company.value = prospect.company || ''
  els.statusBadge.textContent = st.emoji + ' ' + st.label
  els.statusBadge.className = 'badge status-click ' + st.badge
  els.statusSelect.value = prospect.status
  els.contractHeaderBadge.classList.toggle(
    'hidden',
    !hasContractDetailsData(prospect.contractDetails)
  )

  const tel = String(prospect.phone || '').replace(/\s+/g, '')
  els.btnCall.href = tel ? 'tel:' + tel : '#'
  els.btnCall.style.pointerEvents = tel ? '' : 'none'

  els.sector.value = prospect.sector || ''
  els.address.value = prospect.address || ''
  els.phone.value = prospect.phone || ''
  els.assigned.value = prospect.assigned || ''
  els.notes.value = prospect.notes || ''
  els.reminderDate.value = prospect.reminderDate
    ? String(prospect.reminderDate).slice(0, 10)
    : ''
  els.dateAddedDisplay.textContent = formatDate(prospect.dateAdded)

  document.querySelectorAll('input[name="hasWebsite"]').forEach(function (r) {
    r.checked = r.value === prospect.hasWebsite
  })

  fillContractForm(prospect.contractDetails)
  renderOpeningHoursTable(prospect.openingHours)
  updateOpenBadge()

  els.script.value = prospect.script || ''
  els.attentes.value = prospect.attentes || ''
  els.analyse.value = prospect.analyse || ''
  els.instagram.value = prospect.instagram || ''
  els.facebook.value = prospect.facebook || ''
  els.websiteUrl.value = prospect.websiteUrl || ''

  const ig = prospect.instagram.trim()
  const fb = prospect.facebook.trim()
  const web = prospect.websiteUrl.trim()
  els.linkInstagram.href = ig
    ? ig.startsWith('http')
      ? ig
      : 'https://instagram.com/' + ig.replace(/^@/, '')
    : '#'
  els.linkFacebook.href = fb
    ? fb.startsWith('http')
      ? fb
      : 'https://facebook.com/' + fb
    : '#'
  els.linkWebsite.href = web
    ? web.startsWith('http')
      ? web
      : 'https://' + web
    : '#'
  els.linkInstagram.classList.toggle('disabled', !ig)
  els.linkFacebook.classList.toggle('disabled', !fb)
  els.linkWebsite.classList.toggle('disabled', !web)

  renderCallNotes()
}

async function loadProspect() {
  prospectId = getProspectIdFromUrl()
  if (!prospectId) {
    els.loading.textContent = 'ID prospect manquant dans l’URL.'
    return
  }
  try {
    prospect = await fetchProspectById(prospectId)
    document.title = (prospect.company || 'Prospect') + ' — SE Prospection'
    syncUIFromProspect()
    els.loading.classList.add('hidden')
    els.pageContent.classList.remove('hidden')
  } catch (e) {
    console.error(e)
    els.loading.textContent =
      'Impossible de charger la fiche : ' + (e.message || 'erreur')
  }
}

function initEls() {
  els.loading = document.getElementById('loading')
  els.pageContent = document.getElementById('pageContent')
  els.toasts = document.getElementById('toasts')
  els.company = document.getElementById('company')
  els.statusBadge = document.getElementById('statusBadge')
  els.statusSelect = document.getElementById('statusSelect')
  els.contractHeaderBadge = document.getElementById('contractHeaderBadge')
  els.btnCall = document.getElementById('btnCall')
  els.sector = document.getElementById('sector')
  els.address = document.getElementById('address')
  els.phone = document.getElementById('phone')
  els.assigned = document.getElementById('assigned')
  els.notes = document.getElementById('notes')
  els.reminderDate = document.getElementById('reminderDate')
  els.dateAddedDisplay = document.getElementById('dateAddedDisplay')
  els.openingHoursGrid = document.getElementById('openingHoursGrid')
  els.openNowBadge = document.getElementById('openNowBadge')
  els.contractPrice = document.getElementById('contractPrice')
  els.contractDelivery = document.getElementById('contractDelivery')
  els.contractMockup = document.getElementById('contractMockup')
  els.contractDeadline = document.getElementById('contractDeadline')
  els.contractRdvDatetime = document.getElementById('contractRdvDatetime')
  els.contractRdvFormat = document.getElementById('contractRdvFormat')
  els.contractNotes = document.getElementById('contractNotes')
  els.script = document.getElementById('script')
  els.attentes = document.getElementById('attentes')
  els.analyse = document.getElementById('analyse')
  els.instagram = document.getElementById('instagram')
  els.facebook = document.getElementById('facebook')
  els.websiteUrl = document.getElementById('websiteUrl')
  els.linkInstagram = document.getElementById('linkInstagram')
  els.linkFacebook = document.getElementById('linkFacebook')
  els.linkWebsite = document.getElementById('linkWebsite')
  els.callNotesList = document.getElementById('callNotesList')
  els.newCallNote = document.getElementById('newCallNote')
}

function initSectorSelect() {
  SECTORS.forEach(function (s) {
    const o = document.createElement('option')
    o.value = s
    o.textContent = s
    els.sector.appendChild(o)
  })
}

function initStatusSelect() {
  STATUSES.forEach(function (s) {
    const o = document.createElement('option')
    o.value = s.id
    o.textContent = s.emoji + ' ' + s.label
    els.statusSelect.appendChild(o)
  })
}

function initEvents() {
  document.getElementById('btnSaveAll').addEventListener('click', () =>
    saveProspect(true)
  )

  document.querySelectorAll('[data-save-section]').forEach(function (btn) {
    btn.addEventListener('click', () => saveProspect(true))
  })

  els.statusBadge.addEventListener('click', function () {
    els.statusSelect.classList.remove('status-select')
    els.statusSelect.style.position = 'static'
    els.statusSelect.style.opacity = '1'
    els.statusSelect.style.width = 'auto'
    els.statusSelect.style.height = 'auto'
    els.statusSelect.style.pointerEvents = 'auto'
    els.statusSelect.focus()
    if (typeof els.statusSelect.showPicker === 'function') {
      els.statusSelect.showPicker()
    }
  })

  els.statusSelect.addEventListener('change', async function () {
    prospect.status = els.statusSelect.value
    syncUIFromProspect()
    await saveProspect(true)
  })

  document.getElementById('btnCopyScript').addEventListener('click', function () {
    navigator.clipboard
      .writeText(els.script.value)
      .then(() => toast('📋 Script copié'))
      .catch(() => toast('Copie impossible'))
  })

  document.getElementById('btnAddCall').addEventListener('click', async function () {
    const text = els.newCallNote.value.trim()
    if (!text) {
      toast('Écrivez une note d’appel')
      return
    }
    if (!Array.isArray(prospect.callNotes)) prospect.callNotes = []
    prospect.callNotes.push({
      id: noteUid(),
      text: text,
      createdAt: new Date().toISOString()
    })
    els.newCallNote.value = ''
    await saveProspect(true)
    renderCallNotes()
  })

  ;[
    els.company,
    els.sector,
    els.address,
    els.phone,
    els.assigned,
    els.notes,
    els.reminderDate,
    els.script,
    els.attentes,
    els.analyse,
    els.instagram,
    els.facebook,
    els.websiteUrl,
    els.contractPrice,
    els.contractDeadline,
    els.contractNotes
  ].forEach(bindAutosave)

  ;[
    els.contractDelivery,
    els.contractMockup,
    els.contractRdvDatetime,
    els.contractRdvFormat
  ].forEach(function (el) {
    el.addEventListener('change', scheduleAutosave)
  })

  document.querySelectorAll('input[name="hasWebsite"]').forEach(function (r) {
    r.addEventListener('change', scheduleAutosave)
  })

  setInterval(updateOpenBadge, 60000)
}

async function init() {
  if (!requireAuth()) return
  mountAuthUI()
  initEls()
  initSectorSelect()
  initStatusSelect()
  initEvents()
  subscribeProspectsRealtime()
  window.addEventListener('prospects-updated', async function (ev) {
    const detail = ev.detail
    if (detail && detail.new && detail.new.id === prospectId) {
      prospect = rowToProspect(detail.new)
      syncUIFromProspect()
      return
    }
    if (
      detail &&
      detail.eventType === 'DELETE' &&
      detail.old &&
      detail.old.id === prospectId
    ) {
      window.location.href = 'index.html'
      return
    }
    try {
      prospect = await fetchProspectById(prospectId)
      syncUIFromProspect()
    } catch (e) {
      console.error(e)
    }
  })
  await loadProspect()
}

init()
