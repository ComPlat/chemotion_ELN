import uuidv5 from 'uuid/v5';

export const removeOntologyTreeId = (value = '') => value
  .replace(/\s*\$[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
  .trim();

const isRecentlySelected = (node) => node.title === '-- Recently selected --'
  || ['-- Recently selected --', 'recently selected'].includes(node.value);

// Imported ontologies can share external terms. TreeSelect requires unique values.
const uniqueTreeValues = (nodes) => {
  const seen = new Set();
  const visit = (tree, path) => tree.map((node, index) => {
    const nodePath = `${path}/${index}`;
    const value = seen.has(node.value)
      ? `${removeOntologyTreeId(node.value)} $${uuidv5(nodePath, uuidv5.URL)}`
      : node.value;
    seen.add(value);
    return {
      ...node,
      value,
      ...(node.key != null ? { key: value } : {}),
      ...(node.children ? { children: visit(node.children, nodePath) } : {})
    };
  });
  return visit(nodes, 'ontologies');
};

// Keep one history section when several ontologies share a selector.
export const combineOntologyTrees = (...trees) => {
  const nodes = trees.flatMap((tree) => tree || []);
  const recentNodes = nodes.filter(isRecentlySelected);
  const terms = nodes.filter((node) => !isRecentlySelected(node));
  if (recentNodes.length === 0) return uniqueTreeValues(terms);

  const seen = new Set();
  const children = recentNodes.flatMap((node) => node.children || []).filter((node) => {
    const id = node.term_id || node.value?.trim();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return uniqueTreeValues([{ ...recentNodes[0], children }, ...terms]);
};
