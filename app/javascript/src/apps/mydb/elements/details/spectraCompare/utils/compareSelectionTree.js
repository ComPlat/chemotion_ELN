import {
  cleanLayoutLabel,
  resolveAnalysisLayout,
  resolveContainerLayout,
} from './containerLayout';

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
  if (!sample) return { menuItems: [], selectedFiles: [] };
  if (typeof sample.getAnalysisContainersComparable !== 'function') {
    return { menuItems: [], selectedFiles: [] };
  }

  const targetLayout = resolveContainerLayout(comparisonContainer);
  const grouped = sample.getAnalysisContainersComparable() || {};

  const menuItems = Object.keys(grouped)
    .map((layoutKey) => buildLayoutNode(layoutKey, grouped[layoutKey], comparisonContainer, targetLayout))
    .filter(Boolean);

  const rawSelected = comparisonContainer?.extended_metadata?.analyses_compared;
  let selectedFiles = [];
  if (Array.isArray(rawSelected)) {
    const allowed = collectLeafIds(menuItems);
    selectedFiles = rawSelected
      .map((entry) => entry?.file?.id)
      .filter((id) => id != null && allowed.has(id));
  }

  return { menuItems, selectedFiles };
};

export const dropUntypedBranch = ({ menuItems, selectedFiles }) => {
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    return { menuItems: menuItems || [], selectedFiles: selectedFiles || [] };
  }
  const idx = menuItems.findIndex((item) => item.title === 'Type: null');
  if (idx === -1) return { menuItems, selectedFiles };

  const removed = menuItems[idx];
  const idsToRemove = collectLeafIds(removed.children || []);
  const nextMenu = [...menuItems.slice(0, idx), ...menuItems.slice(idx + 1)];
  const nextSelected = (selectedFiles || []).filter((id) => !idsToRemove.has(id));
  return { menuItems: nextMenu, selectedFiles: nextSelected };
};

export const filterMenuByLayout = (menuItems, selectedLayoutTitle) => {
  if (!Array.isArray(menuItems) || !selectedLayoutTitle) return menuItems || [];
  return menuItems.map((item) => (
    item.title === selectedLayoutTitle ? item : { ...item, disabled: true }
  ));
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
}) => {
  if (!Array.isArray(selectedFiles) || !info) return [];
  return selectedFiles.map((fileId) => {
    const fileNode = findNode(fileId, treeData);
    const datasetNode = findParent(fileId, treeData);
    const analysisNode = datasetNode ? findParent(datasetNode.key, treeData) : null;
    const layoutNode = analysisNode ? findParent(analysisNode.key, treeData) : null;
    return {
      file: { id: fileId, name: fileNode?.title || `File ${fileId}` },
      dataset: datasetNode
        ? { id: datasetNode.key, name: datasetNode.title }
        : { id: null, name: null },
      analysis: analysisNode
        ? { id: analysisNode.key, name: analysisNode.title }
        : { id: null, name: null },
      layout: layoutNode ? layoutNode.title : null,
    };
  });
};

export { cleanLayoutLabel };
