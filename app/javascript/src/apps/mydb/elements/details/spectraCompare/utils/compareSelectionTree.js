import {
  cleanLayoutLabel,
  resolveAnalysisLayout,
  resolveContainerLayout,
} from 'src/apps/mydb/elements/details/spectraCompare/utils/containerLayout';

const COMPARABLE_FILENAME = /(peak|edit|compared)/i;
const JCAMP_EXT = new Set(['jdx', 'dx', 'jcamp']);

const filenameExt = (filename = '') => {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
};

export const filterComparableAttachments = (dataset) => {
  if (!dataset || !Array.isArray(dataset.attachments)) return [];
  return dataset.attachments.filter((att) => {
    if (!att?.filename) return false;
    const ext = filenameExt(att.filename);
    if (!JCAMP_EXT.has(ext)) return false;
    return COMPARABLE_FILENAME.test(att.filename);
  });
};

// excludeIds carries the source-file ids already part of the comparison (see
// buildSelectionTree) so the same original spectrum can't be picked again from its home
// analysis branch — it stays visible/checked only once, under the comparison's own branch.
const buildDatasetNode = (dataset, disableAIC, excludeIds, isOwnComparisonBranch) => {
  const attachments = filterComparableAttachments(dataset)
    .filter((att) => isOwnComparisonBranch || !excludeIds.has(att.id));
  if (attachments.length === 0) return null;
  return {
    title: `Dataset: ${dataset.name}`,
    key: dataset.id,
    value: dataset.id,
    disabled: disableAIC,
    checkable: false,
    children: attachments.map((att) => ({
      title: att.filename,
      key: att.id,
      value: att.id,
      disabled: disableAIC,
    })),
  };
};

const buildAnalysisNode = (aic, layoutKey, targetLayout, excludeIds, isOwnComparisonBranch) => {
  const aicLayout = resolveAnalysisLayout(aic, layoutKey);
  const disableAIC = !!targetLayout && aicLayout !== targetLayout;
  const datasetNodes = (aic.children || [])
    .map((dts) => buildDatasetNode(dts, disableAIC, excludeIds, isOwnComparisonBranch))
    .filter(Boolean);
  if (datasetNodes.length === 0) return null;
  return {
    title: aic.comparable_info?.is_comparison
      ? `Comparison: ${aic.name}`
      : `Analysis: ${aic.name}`,
    key: aic.id,
    value: aic.id,
    disabled: disableAIC,
    checkable: false,
    children: datasetNodes,
  };
};

const buildLayoutNode = (layoutKey, comparableForLayout, comparisonContainer, targetLayout, excludeIds) => {
  const analyses = comparableForLayout
    .map((aicOrigin) => {
      const isOwnComparisonBranch = !!comparisonContainer && aicOrigin.id === comparisonContainer.id;
      const aic = isOwnComparisonBranch ? comparisonContainer : aicOrigin;
      return buildAnalysisNode(aic, layoutKey, targetLayout, excludeIds, isOwnComparisonBranch);
    })
    .filter(Boolean);
  if (analyses.length === 0) return null;
  const disableLayout = !!targetLayout && layoutKey !== targetLayout;
  return {
    title: layoutKey ? `Type: ${layoutKey}` : 'Type: Not specified',
    key: layoutKey || 'no_type',
    value: layoutKey || 'no_type',
    disabled: disableLayout,
    checkable: false,
    children: analyses,
  };
};

const collectLeafIds = (nodes, target = new Set()) => {
  if (!nodes) return target;
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      collectLeafIds(node.children, target);
    } else {
      target.add(node.key);
    }
  });
  return target;
};

export const buildSelectionTree = (sample, comparisonContainer) => {
  if (!sample) return { menuItems: [], selectedFiles: [] };
  if (typeof sample.getAnalysisContainersComparable !== 'function') {
    return { menuItems: [], selectedFiles: [] };
  }

  const targetLayout = resolveContainerLayout(comparisonContainer);
  const grouped = sample.getAnalysisContainersComparable() || {};

  const rawSelected = comparisonContainer?.extended_metadata?.analyses_compared;
  // The comparison's generated dataset holds a *copy* of each source file (a new attachment
  // id), so locking that copy alone doesn't stop the original from being picked again. Each
  // entry also carries the original's id under `source.file.id` (see resolveSelection) —
  // use it to hide the original from its home analysis branch once it's already included.
  const alreadyIncludedSourceIds = new Set(
    (Array.isArray(rawSelected) ? rawSelected : [])
      .map((entry) => entry?.source?.file?.id ?? entry?.file?.id)
      .filter((id) => id != null),
  );

  const menuItems = Object.keys(grouped)
    .map((layoutKey) => buildLayoutNode(
      layoutKey,
      grouped[layoutKey],
      comparisonContainer,
      targetLayout,
      alreadyIncludedSourceIds,
    ))
    .filter(Boolean);

  let selectedFiles = [];
  if (Array.isArray(rawSelected)) {
    const allowed = collectLeafIds(menuItems);
    selectedFiles = rawSelected
      .map((entry) => entry?.file?.id)
      .filter((id) => id != null && allowed.has(id));
  }

  return { menuItems, selectedFiles };
};

export const filterMenuByLayout = (menuItems, selectedLayoutTitle) => {
  if (!Array.isArray(menuItems) || !selectedLayoutTitle) return menuItems || [];
  return menuItems.filter((item) => item.title === selectedLayoutTitle);
};

// Used by the "add spectrum to an existing comparison" flow: already-included leaves must
// stay checked but not be uncheckable, so removal remains possible only via Reset. Uses
// disableCheckbox (not disabled) so only the checkbox interaction is blocked — `disabled`
// also greys out the node's title via antd's treenode-disabled class, which makes an
// already-checked leaf look unselected instead of checked-but-locked.
export const lockSelectedLeaves = (menuItems, selectedIds) => {
  if (!Array.isArray(menuItems)) return [];
  const locked = new Set(selectedIds || []);
  const walk = (nodes) => nodes.map((node) => {
    if (!node.children || node.children.length === 0) {
      return locked.has(node.value) ? { ...node, disableCheckbox: true } : node;
    }
    return { ...node, children: walk(node.children) };
  });
  return walk(menuItems);
};

export const limitMenuToSelection = (menuItems, allowedIds) => {
  if (!Array.isArray(menuItems)) return [];
  if (!allowedIds || allowedIds.length === 0) return [];
  const allowed = new Set(allowedIds);
  const walk = (nodes) => nodes.reduce((acc, node) => {
    if (!node.children || node.children.length === 0) {
      if (allowed.has(node.value)) acc.push(node);
      return acc;
    }
    const children = walk(node.children);
    if (children.length > 0) acc.push({ ...node, children });
    return acc;
  }, []);
  return walk(menuItems);
};

const findNode = (key, tree) => {
  if (!Array.isArray(tree)) return null;
  for (const node of tree) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNode(key, node.children);
      if (found) return found;
    }
  }
  return null;
};

const findParent = (key, tree) => {
  if (!Array.isArray(tree)) return null;
  for (const node of tree) {
    if (node.children?.some((c) => c.key === key)) return node;
    if (node.children) {
      const found = findParent(key, node.children);
      if (found) return found;
    }
  }
  return null;
};

export const resolveSelection = ({
  treeData,
  selectedFiles,
  info,
  existingEntries,
}) => {
  if (!Array.isArray(selectedFiles) || !info) return [];
  return selectedFiles.map((fileId) => {
    const fileNode = findNode(fileId, treeData);
    const datasetNode = findParent(fileId, treeData);
    const analysisNode = datasetNode ? findParent(datasetNode.key, treeData) : null;
    const layoutNode = analysisNode ? findParent(analysisNode.key, treeData) : null;
    // An already-locked leaf's value IS the generated copy's id, not the original's — reuse
    // the source it already carries so re-resolving on every change (each add-mode toggle)
    // doesn't clobber the true original with a self-reference to the copy. Only a brand new
    // pick (no existing entry yet) gets its source set from the id being resolved here.
    const existingEntry = Array.isArray(existingEntries)
      ? existingEntries.find((entry) => entry?.file?.id === fileId)
      : null;
    const source = existingEntry?.source ?? { file: { id: fileId } };
    return {
      file: { id: fileId, name: fileNode?.title || `File ${fileId}` },
      dataset: datasetNode
        ? { id: datasetNode.key, name: datasetNode.title }
        : { id: null, name: null },
      analysis: analysisNode
        ? { id: analysisNode.key, name: analysisNode.title }
        : { id: null, name: null },
      layout: layoutNode ? layoutNode.title : null,
      // Preserved verbatim by the backend when the comparison dataset is (re)generated,
      // even though `file.id` itself gets rewritten to point at the generated copy —
      // see buildSelectionTree's alreadyIncludedSourceIds.
      source,
    };
  });
};

export { cleanLayoutLabel };
