// Remote control confirm window, opened from the icon menu "Share browser…".
// An extension page, so websites cannot restyle or click it (unlike in-page UI).
// See remote-tunnel.ts and startRemoteControl in background.ts.

const tabId = Number(new URLSearchParams(location.search).get('tabId'))
const statusText = document.getElementById('status') as HTMLParagraphElement
const shareButton = document.getElementById('share') as HTMLButtonElement
const cancelButton = document.getElementById('cancel') as HTMLButtonElement

cancelButton.addEventListener('click', () => {
  window.close()
})

shareButton.addEventListener('click', async () => {
  shareButton.disabled = true
  statusText.classList.remove('error')
  statusText.textContent = 'Starting…'
  const result: { success: boolean; error?: string } | undefined = await chrome.runtime
    .sendMessage({ action: 'remoteControlStart', tabId })
    .catch((error: Error) => {
      return { success: false, error: error.message }
    })
  if (result?.success) {
    statusText.textContent = 'Copied prompt. Paste it to your agent.'
    window.setTimeout(() => {
      window.close()
    }, 1500)
    return
  }
  statusText.classList.add('error')
  statusText.textContent = `Remote control failed: ${result?.error || 'unknown error'}`
  shareButton.disabled = false
})

export {}
