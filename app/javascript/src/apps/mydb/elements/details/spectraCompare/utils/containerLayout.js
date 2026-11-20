const TYPE_PREFIX = /^Type:\s*/i;

export const cleanLayoutLabel = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(TYPE_PREFIX, '').split('|').pop().trim();
  if (!cleaned || cleaned === 'null' || cleaned === 'Not specified') return null;
  return cleaned;
};

export const resolveContainerLayout = (container) => {
  if (!container) return null;
  const raw = container?.extended_metadata?.kind
    || container?.comparable_info?.layout
    || null;
  return cleanLayoutLabel(raw);
};

export const resolveAnalysisLayout = (aic, fallbackLayoutKey = null) => {
  const raw = aic?.extended_metadata?.kind
    || aic?.comparable_info?.layout
    || fallbackLayoutKey
    || null;
  return cleanLayoutLabel(raw);
};
