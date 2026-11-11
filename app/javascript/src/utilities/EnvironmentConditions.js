import { getGenSI } from 'chem-generic-ui';

export const PRESSURE_UNITS = getGenSI('pressure');

export const ENVIRONMENT_UNITS = {
  temperature: ['°C', '°F', 'K'],
  humidity: ['%'],
  air_pressure: PRESSURE_UNITS.map(({ key }) => key),
};

// Match SI symbols exactly: mPa (millipascal) must never become the MPa key "mpa".
const PRESSURE_UNIT_ALIASES = new Map(PRESSURE_UNITS.map(({ key, label }) => [label, key]));

export const normalizeEnvironmentUnit = (field, unit) => {
  if (typeof unit !== 'string' || unit.trim() === '') { return undefined; }

  const key = unit.trim();
  if (ENVIRONMENT_UNITS[field].includes(key)) { return key; }
  const alias = field === 'air_pressure' ? PRESSURE_UNIT_ALIASES.get(key) : undefined;
  // Preserve unsupported labels exactly so an unrelated save cannot relabel a reading.
  return alias || unit;
};

// Incomplete drafts such as "-" and "." may be typed, but are not measurements.
export const isEnvironmentNumber = (value) => {
  const text = `${value ?? ''}`.trim();
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text));
};
