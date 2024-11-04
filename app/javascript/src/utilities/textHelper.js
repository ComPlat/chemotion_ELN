// replace _ with space and capitalize first letter of each word
const capitalizeWords = (string) => (string || '')
  .replace(/_+/, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (m) => m.toUpperCase());

export default capitalizeWords;
