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
    const {
      checkedIds, checkedAll, uncheckedIds
    } = uiState[type] || {};
    if (checkedIds?.size > 0 || checkedAll) {
      selections[type] = { checkedIds, checkedAll, uncheckedIds };
    }
    return selections;
  }, {});
}

function getIds(value) {
  if (value?.toArray) return value.toArray();
  return value || [];
}

export async function fetchCollectionIds(fetchPage, collectionId, params, elementState) {
  const firstPage = await fetchPage(collectionId, { ...params, page: 1 }, elementState);
  const pages = firstPage.pages || 1;
  const remainingPages = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => (
      fetchPage(collectionId, { ...params, page: index + 2 }, elementState)
    )),
  );
  return [firstPage, ...remainingPages].flatMap(({ elements = [] }) => (
    elements.map(({ id }) => id)
  ));
}

function getSearchScopeIds(type, uiState, elementState) {
  const pluralType = `${type}s`;
  const storedIds = elementState.elements?.[pluralType]?.ids;
  if (storedIds) return getIds(storedIds);
  return getIds(uiState.currentSearchByID?.[pluralType]?.ids);
}

export async function resolvePrintableSelections(
  selectionsByType, uiState, elementState, fetchScopeIds
) {
  const resolved = {};
  await Promise.all(Object.entries(selectionsByType).map(async ([type, selection]) => {
    if (!selection.checkedAll) {
      resolved[type] = selection.checkedIds;
      return;
    }

    const scopeIds = uiState.currentSearchByID || uiState.currentSearchSelection
      ? getSearchScopeIds(type, uiState, elementState)
      : await fetchScopeIds(type, uiState, elementState);
    const excludedIds = new Set(getIds(selection.uncheckedIds).map(String));
    resolved[type] = scopeIds.filter((id) => !excludedIds.has(String(id)));
  }));
  return resolved;
}

export function buildPrintCodeUrls(selectionsByType, config) {
  const requests = [];
  Object.entries(selectionsByType).forEach(([elementType, ids]) => {
    const selectedIds = getIds(ids);
    if (selectedIds.length === 0) return;

    const params = new URLSearchParams({ element_type: elementType });
    params.append('ids[]', selectedIds.join(','));
    Object.entries(config).forEach(([key, value]) => {
      params.append(key, value);
    });
    requests.push(`/api/v1/code_logs/print_codes?${params.toString()}`);
  });
  return requests;
}
