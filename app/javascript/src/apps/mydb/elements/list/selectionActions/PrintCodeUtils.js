export const PRINTABLE_ELEMENT_TYPES = [
  'sample',
  'reaction',
  'wellplate',
  'screen',
  'device_description',
  'sequence_based_macromolecule_sample',
];

export function getPrintableSelections(uiState) {
  return PRINTABLE_ELEMENT_TYPES.reduce((selections, type) => {
    const checkedIds = uiState[type]?.checkedIds;
    if (checkedIds?.size > 0) {
      selections[type] = checkedIds;
    }
    return selections;
  }, {});
}

export function buildPrintCodeUrls(selectionsByType, config) {
  const requests = [];
  Object.entries(selectionsByType).forEach(([elementType, checkedIds]) => {
    checkedIds.forEach((id) => {
      const params = new URLSearchParams({ element_type: elementType });
      params.append('ids[]', id);
      Object.entries(config).forEach(([key, value]) => {
        params.append(key, value);
      });
      requests.push(`/api/v1/code_logs/print_codes?${params.toString()}`);
    });
  });
  return requests;
}
