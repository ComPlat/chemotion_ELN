// Forward synthesis canvas layout: the three inputs on the left, the synthesis
// step in the middle and the predicted products on the right, best rank first.
// Both columns are centred on the synthesis step. Positions are vertical
// centres: render with nodeOrigin={[0, 0.5]}.
import {
  MOLECULE_COLUMN, ROW_HEIGHT, arrowEdge, cheapestPrice
} from 'src/apps/mydb/elements/details/predictions/retroTree';

// Node ids double as the labels ForwardActions.handleChange switches on.
export const FORWARD_INPUTS = [
  { id: 'Reactant', optional: false },
  { id: 'Reagent', optional: true },
  { id: 'Solvent', optional: true },
];

const SYNTHESIS_ID = 'Synthesis';
const SYNTHESIS_COLUMN = 200;

const centredRow = (index, count) => (index - (count - 1) / 2) * ROW_HEIGHT;

// `inputs` maps an input id to { smiles, png } of the dropped sample.
export function layoutForward(inputs = {}, outcomes = []) {
  const nodes = [];
  const edges = [];

  FORWARD_INPUTS.forEach(({ id, optional }, i) => {
    nodes.push({
      id,
      type: 'input',
      data: { label: id, optional, ...inputs[id] },
      position: { x: 0, y: centredRow(i, FORWARD_INPUTS.length) },
      selectable: false,
    });
    edges.push(arrowEdge(id, SYNTHESIS_ID));
  });

  nodes.push({
    id: SYNTHESIS_ID,
    type: 'synthesis',
    data: { ready: Boolean(inputs.Reactant?.smiles) },
    position: { x: MOLECULE_COLUMN, y: 0 },
    selectable: false,
  });

  [...outcomes]
    .sort((a, b) => a.rank - b.rank)
    .forEach((outcome, i, sorted) => {
      const id = `outcome.${i}`;
      nodes.push({
        id,
        type: 'outcome',
        data: {
          smiles: outcome.smiles,
          svg: outcome.png,
          buy: outcome.is_buyable,
          buyables: outcome.buyables,
          price: cheapestPrice(outcome.buyables),
          rank: outcome.rank,
          prob: outcome.prob,
        },
        position: { x: MOLECULE_COLUMN + SYNTHESIS_COLUMN, y: centredRow(i, sorted.length) },
      });
      edges.push(arrowEdge(SYNTHESIS_ID, id, outcome.rank === 1));
    });

  return { nodes, edges };
}
