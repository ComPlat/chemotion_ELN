// Retrosynthesis tree helpers: turn the prediction server's response into a
// nested model, graft expansions onto it, and lay the model out for reactflow.
//
// The server returns routes as nested nodes that alternate
//   molecule -> reactions -> molecules -> reactions -> ...
// Every node in the model gets a key built from its path ("root.0.1"), which
// stays unique even when an expansion returns ids already used elsewhere.

// Horizontal room per column (box plus gap) and vertical room per leaf row.
export const MOLECULE_COLUMN = 320;
export const REACTION_COLUMN = 200;
export const ROW_HEIGHT = 260;

// reactflow node type for each kind of model node.
const NODE_TYPES = { root: 'root', molecule: 'custom', reaction: 'reaction' };

// Lowest price per gram over all vendors, or null when nobody sells it.
export const cheapestPrice = (buyables) => {
  const prices = (buyables?.result || [])
    .filter((item) => item.ppg !== null && item.ppg !== undefined && item.ppg !== '')
    .map((item) => Number(item.ppg))
    .filter((ppg) => Number.isFinite(ppg));
  return prices.length > 0 ? Math.min(...prices) : null;
};

const moleculeData = (molecule) => ({
  smiles: molecule.smiles,
  svg: molecule.svg,
  buy: molecule.is_buyable,
  buyables: molecule.buyables,
  price: cheapestPrice(molecule.buyables),
});

const reactionData = (reaction, key) => ({
  id: key,
  smiles: reaction.smiles,
  plausibility: reaction.plausibility,
  rank: reaction.rank,
  svg: reaction.svg,
  molwt: reaction.rms_molwt,
  necessary_reagent: reaction.necessary_reagent,
  tforms: reaction.tforms,
});

function convertMolecule(molecule, key) {
  return {
    key,
    kind: 'molecule',
    data: moleculeData(molecule),
    // eslint-disable-next-line no-use-before-define
    children: (molecule.children || []).map((reaction, i) => convertReaction(reaction, `${key}.${i}`)),
  };
}

function convertReaction(reaction, key) {
  return {
    key,
    kind: 'reaction',
    data: reactionData(reaction, key),
    children: (reaction.children || []).map((molecule, i) => convertMolecule(molecule, `${key}.${i}`)),
  };
}

// Every route in `trees` starts at the requested molecule; collect their first
// reactions under one parent, skipping a reaction another route already gave.
function reactionsFromResponse(response, parentKey) {
  const seen = new Set();
  const reactions = [];
  (response.trees || []).forEach((tree) => {
    (tree.children || []).forEach((reaction) => {
      if (seen.has(reaction.smiles)) return;
      seen.add(reaction.smiles);
      reactions.push(reaction);
    });
  });
  return reactions.map((reaction, i) => convertReaction(reaction, `${parentKey}.${i}`));
}

export function buildRetroTree(response) {
  // Each route's top node is the requested molecule; it carries the vendor info.
  const target = (response.trees || [])[0] || {};
  return {
    key: 'root',
    kind: 'root',
    data: {
      ...moleculeData(target),
      smiles: response.request.smiles[0],
      svg: response.request.svg,
    },
    children: reactionsFromResponse(response, 'root'),
  };
}

// Replace the children of the molecule `key` with the reactions in `response`.
export function expandMolecule(tree, key, response) {
  if (tree.key === key) {
    return { ...tree, children: reactionsFromResponse(response, key) };
  }
  if (!key.startsWith(`${tree.key}.`)) return tree;
  return { ...tree, children: tree.children.map((child) => expandMolecule(child, key, response)) };
}

const countDescendants = (node) => node.children.reduce(
  (sum, child) => sum + 1 + countDescendants(child), 0
);

export function countReactions(response) {
  return reactionsFromResponse(response, 'root').length;
}

// Molecule and reaction columns alternate, starting with a molecule at depth 0.
const columnX = (depth) => (
  Math.ceil(depth / 2) * MOLECULE_COLUMN + Math.floor(depth / 2) * REACTION_COLUMN
);

const EDGE_COLOR = '#6c757d';

// Plain arrow from parent to child; `heavy` marks the best-ranked branch.
export const arrowEdge = (source, target, heavy = false) => ({
  id: `${source}->${target}`,
  source,
  target,
  type: 'smoothstep',
  markerEnd: { type: 'arrowclosed', color: EDGE_COLOR },
  style: { stroke: EDGE_COLOR, strokeWidth: heavy ? 2.5 : 1.25 },
});

// Each leaf takes the next free row and each parent is centred on its first
// and last child, so branches never overlap. Positions are vertical centres:
// render with nodeOrigin={[0, 0.5]}. Children of keys in `folded` are hidden.
export function layoutRetroTree(tree, folded = new Set()) {
  const nodes = [];
  const edges = [];
  let nextRow = 0;

  const place = (node, depth, parentKey) => {
    const isFolded = folded.has(node.key) && node.children.length > 0;
    const visibleChildren = isFolded ? [] : node.children;
    let y;
    if (visibleChildren.length === 0) {
      y = nextRow * ROW_HEIGHT;
      nextRow += 1;
    } else {
      const childYs = visibleChildren.map((child) => place(child, depth + 1, node.key));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }

    nodes.push({
      id: node.key,
      type: NODE_TYPES[node.kind],
      data: {
        ...node.data,
        expanded: node.children.length > 0,
        folded: isFolded,
        hiddenCount: isFolded ? countDescendants(node) : 0,
      },
      position: { x: columnX(depth), y },
      sourcePosition: 'right',
      targetPosition: 'left',
    });
    if (parentKey) {
      // The line into each parent's best-ranked reaction is drawn heavier.
      edges.push(arrowEdge(parentKey, node.key, node.kind === 'reaction' && node.data.rank === 1));
    }
    return y;
  };

  if (tree) place(tree, 0, null);
  return { nodes, edges };
}
