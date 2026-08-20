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

const buildDatasetNode = (dataset, disableAIC) => {
  const attachments = filterComparableAttachments(dataset);
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

const buildAnalysisNode = (aic, layoutKey, targetLayout) => {
  const aicLayout = resolveAnalysisLayout(aic, layoutKey);
  const disableAIC = !!targetLayout && aicLayout !== targetLayout;
  const datasetNodes = (aic.children || [])
    .map((dts) => buildDatasetNode(dts, disableAIC))
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

const buildLayoutNode = (layoutKey, comparableForLayout, comparisonContainer, targetLayout) => {
  const analyses = comparableForLayout
    .map((aicOrigin) => {
      const aic = comparisonContainer && aicOrigin.id === comparisonContainer.id
        ? comparisonContainer
        : aicOrigin;
      return buildAnalysisNode(aic, layoutKey, targetLayout);
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
  if (!sample) return { menuItems: [], selectedFiles: [], sourceFiles: [] };
  if (typeof sample.getAnalysisContainersComparable !== 'function') {
    return { menuItems: [], selectedFiles: [], sourceFiles: [] };
  }

  const targetLayout = resolveContainerLayout(comparisonContainer);
  const grouped = sample.getAnalysisContainersComparable() || {};

  const menuItems = Object.keys(grouped)
    .map((layoutKey) => buildLayoutNode(layoutKey, grouped[layoutKey], comparisonContainer, targetLayout))
    .filter(Boolean);

  const rawSelected = comparisonContainer?.extended_metadata?.analyses_compared;
  let selectedFiles = [];
  let sourceFiles = [];
  if (Array.isArray(rawSelected)) {
    const allowed = collectLeafIds(menuItems);
    selectedFiles = rawSelected
      .map((entry) => entry?.file?.id)
      .filter((id) => id != null && allowed.has(id));
    // The comparison's generated dataset holds a *copy* of each source file (a new
    // attachment id) — `source.file.id` (see resolveSelection) is the original spectrum's
    // id, still sitting under its own analysis branch. Exposed separately (not filtered
    // out of the tree — that hides the row entirely, which reads as data loss) so callers
    // can lock it visibly instead, e.g. while adding a spectrum to an existing comparison.
    sourceFiles = rawSelected
      .map((entry) => entry?.source?.file?.id)
      .filter((id) => id != null && allowed.has(id));
  }

  return { menuItems, selectedFiles, sourceFiles };
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

// antd's TreeSelect removes a value from onChange's `value` when its tag is closed (or via
// backspace) regardless of disableCheckbox — that prop only blocks the tree's own checkbox
// click. Re-add any locked id a caller dropped so a generated spectrum can't be deselected
// through the tag either; removal stays a Reset-only action while adding a spectrum.
export const enforceLockedSelection = (value, lockedIds) => {
  const base = Array.isArray(value) ? value : [];
  if (!Array.isArray(lockedIds) || lockedIds.length === 0) return base;
  return Array.from(new Set([...base, ...lockedIds]));
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
