import { rootStore } from 'src/stores/mobx/RootStore';

const COPY_TOAST_UID = 'copy-to-clipboard';

// Surfaced only when a copy fails, so a silent no-op can never look like a success.
// Success stays silent to avoid a toast on every copy click.
function notifyCopyFailure() {
  rootStore.notifications.add({
    title: 'Copy failed',
    message: 'Could not copy to the clipboard.',
    level: 'error',
    position: 'tr',
    autoDismiss: 5,
    uid: COPY_TOAST_UID,
  });
}

// Legacy fallback for non-secure (http://) contexts where navigator.clipboard is undefined.
function copyWithExecCommand(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

// Copies text to the clipboard, resolving to true on success and false on failure,
// and toasts on failure so callers get feedback for free. navigator.clipboard requires
// a secure context (https / localhost); on plain http:// origins it is undefined, so
// fall back to the legacy execCommand path.
export async function copyToClipboard(text) {
  const value = text == null ? '' : String(text);
  let ok = false;

  if (navigator?.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (e) { /* fall through to the legacy path */ }
  }

  if (!ok) {
    ok = copyWithExecCommand(value);
  }

  if (!ok) {
    notifyCopyFailure();
  }
  return ok;
}
