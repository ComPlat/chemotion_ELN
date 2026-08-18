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
  try {
    ta.focus();
    ta.select();
    return document.execCommand('copy');
  } catch (e) {
    return false;
  } finally {
    // always remove the temporary node, even if focus/select/execCommand threw
    ta.remove();
  }
}

// Writes text/plain and text/html together; resolves false where ClipboardItem is unsupported.
async function writeRich(value, html) {
  if (typeof window.ClipboardItem !== 'function' || typeof navigator.clipboard.write !== 'function') return false;
  try {
    await navigator.clipboard.write([new window.ClipboardItem({
      'text/plain': new Blob([value], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    })]);
    return true;
  } catch (e) {
    return false;
  }
}

// Resolves true on success, false (with an error toast) on failure. Tries html+text, then
// text only, then execCommand, since navigator.clipboard is undefined on plain http://.
export async function copyToClipboard(text, { html } = {}) {
  const value = text == null ? '' : String(text);
  let ok = false;

  if (html && navigator?.clipboard && window.isSecureContext) {
    ok = await writeRich(value, String(html));
  }

  if (!ok && navigator?.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (e) { /* fall through to the legacy path */ }
  }

  if (!ok) {
    // guard the whole legacy path (createElement/appendChild can throw too) so any
    // failure resolves to false and toasts rather than rejecting the promise
    try {
      ok = copyWithExecCommand(value);
    } catch (e) {
      ok = false;
    }
  }

  if (!ok) {
    notifyCopyFailure();
  }
  return ok;
}

// Same job as copyToClipboard, but usable from a plain http:// origin — the
// async Clipboard API is only available in a secure context, so fall back to a
// throwaway textarea + execCommand there. Resolves to whether the copy worked,
// so the caller can show "Copied" versus "Press Ctrl+C".
export async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) { /* fall through to the legacy path */ }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
  document.body.removeChild(textarea);
  return copied;
}
