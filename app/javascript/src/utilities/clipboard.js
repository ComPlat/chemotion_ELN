export function copyToClipboard(text) {
  return navigator?.clipboard?.writeText(text);
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
