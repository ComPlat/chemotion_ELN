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

export default buildCompareInfos;
