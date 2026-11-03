// Canonical unit keys accepted by ReactionAPI's environment_params.
export const ENVIRONMENT_UNITS = {
  temperature: ['°C', '°F', 'K'],
  humidity: ['%'],
  air_pressure: ['atm', 'pa', 'kpa', 'mpa', 'hpa', 'torr', 'bar', 'mbar'],
};

// Incomplete drafts such as "-" and "." may be typed, but are not measurements.
export const isEnvironmentNumber = (value) => {
  const text = `${value ?? ''}`.trim();
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text));
};
