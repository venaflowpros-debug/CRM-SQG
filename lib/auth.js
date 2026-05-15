import { supabase } from './supabase.js'

const AUTH_STORAGE_KEY = 'se_crm_username'

export function getUsername() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setUsername(username) {
  localStorage.setItem(AUTH_STORAGE_KEY, String(username))
}

export function logout() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function requireAuth() {
  if (!getUsername()) {
    window.location.replace('login.html')
    return false
  }
  return true
}

/** @returns {Promise<string>} username connecté */
export async function login(username, password) {
  const user = String(username || '').trim()
  const pass = String(password || '')

  if (!user || !pass) {
    throw new Error('Veuillez saisir un identifiant et un mot de passe.')
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, password')
    .eq('username', user)
    .maybeSingle()

  if (error) throw error
  if (!data || data.password !== pass) {
    throw new Error('Identifiants incorrects.')
  }

  setUsername(data.username)
  return data.username
}

export function mountAuthUI() {
  const username = getUsername()
  if (!username) return

  document.querySelectorAll('[data-auth-username]').forEach(function (el) {
    el.textContent = username
  })

  document.querySelectorAll('[data-auth-logout]').forEach(function (btn) {
    if (btn.dataset.authBound) return
    btn.dataset.authBound = '1'
    btn.addEventListener('click', function () {
      logout()
      window.location.href = 'login.html'
    })
  })
}
