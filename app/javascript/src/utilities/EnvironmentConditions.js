// Incomplete drafts such as "-" and "." may be typed, but are not measurements.
export const isEnvironmentNumber = (value) => {
  const text = `${value ?? ''}`.trim();
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text));
};
