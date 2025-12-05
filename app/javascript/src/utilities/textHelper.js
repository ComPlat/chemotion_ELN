// replace _ with space and capitalize first letter of each word
const capitalizeWords = (string) => (string || '')
  .replace(/_+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (m) => m.toUpperCase());

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
};

export { capitalizeWords, truncateText };
