export function copyToClipboard(text) {
  return navigator?.clipboard?.writeText(text);
}
