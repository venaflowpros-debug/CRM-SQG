import { getUsername, login } from './lib/auth.js'

if (getUsername()) {
  window.location.replace('index.html')
}

const form = document.getElementById('loginForm')
const errorEl = document.getElementById('loginError')
const btnSubmit = document.getElementById('btnSubmit')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')

function showError(msg) {
  errorEl.textContent = msg
  errorEl.classList.add('show')
}

function hideError() {
  errorEl.textContent = ''
  errorEl.classList.remove('show')
}

form.addEventListener('submit', async function (e) {
  e.preventDefault()
  hideError()
  btnSubmit.disabled = true

  try {
    await login(usernameInput.value, passwordInput.value)
    window.location.replace('index.html')
  } catch (err) {
    showError(err.message || 'Connexion impossible.')
    btnSubmit.disabled = false
  }
})
