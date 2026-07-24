export const buildCompareInfos = (sample, container) => {
  if (!sample || !container) return [];
  const analysesCompared = container?.extended_metadata?.analyses_compared;
  if (!Array.isArray(analysesCompared)) return [];
  return analysesCompared
    .filter((data) => data?.file?.id != null)
    .map((data) => ({
      idx: data.file.id,
      info: data,
    }));
};

const sortedFileIds = (entries) => (entries || [])
  .map((e) => e?.file?.id ?? e?.id)
  .filter((id) => id != null)
  .sort();

export const hasUnsavedComparisonSelection = (container) => {
  if (!container) return false;
  const savedIds = sortedFileIds(container?.comparable_info?.list_attachments);
  const currentIds = sortedFileIds(container?.extended_metadata?.analyses_compared);
  if (savedIds.length !== currentIds.length) return true;
  return savedIds.some((id, i) => id !== currentIds[i]);
};

export const canOpenComparisonEditor = (container) => {
  if (!container) return false;
  const currentIds = sortedFileIds(container?.extended_metadata?.analyses_compared);
  if (currentIds.length === 0) return false;
  return !hasUnsavedComparisonSelection(container);
};

export default buildCompareInfos;
