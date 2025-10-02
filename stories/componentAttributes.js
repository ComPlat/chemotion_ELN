// Helper function to get CSS custom property value
const getCSSCustomProperty = (name) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(`Cannot access CSS custom property "${name}" - DOM not available`);
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) {
    throw new Error(`CSS custom property "${name}" not found or has no value`);
  }
  return value;
};

// Helper function to get color value from title
export const getColorValue = (title) => {
  const cssVarName = `--${title}`;
  return getCSSCustomProperty(cssVarName);
};

export const sizeAttributes = ['lg', 'md', 'sm', 'xsm', 'xxsm'];
export const colorAttributes = ['primary', 'secondary', 'success', 'danger', 'warning', 'light', 'paper', 'knock-out'];
