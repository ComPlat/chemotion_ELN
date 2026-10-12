import React, { createContext, memo, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Handle, NodeToolbar, Position } from 'reactflow';
import { cheapestPrice } from 'src/apps/mydb/elements/details/predictions/retroTree';
import DropTargetMolecule from 'src/apps/mydb/elements/details/predictions/dragNdrop';

// Node boxes for the forward and retrosynthesis canvases. They live at module
// level so reactflow keeps the same component types between renders, and each
// box keeps its own hover state so hovering does not re-render the whole canvas.

// Actions the boxes can trigger; the Forward / Retro containers provide the
// handlers that apply to their canvas.
export const PredictionFlowContext = createContext({
  onExpand: () => {},
  onToggleFold: () => {},
  onDropSample: () => {},
});

const SMILES_PREVIEW = 32;

const shortSmiles = (smiles = '') => (
  smiles.length > SMILES_PREVIEW ? `${smiles.slice(0, SMILES_PREVIEW - 1)}…` : smiles
);

const formatPrice = (price) => `$${Number(price.toFixed(2))}/g`;

const formatPercent = (value) => (
  Number.isFinite(value) ? `${Math.round(value * 100)}%` : '–'
);

const imageSrc = (base64) => `data:image/png;base64,${base64}`;

// The handles only anchor the edges; users cannot draw their own connections.
const NodeHandles = () => (
  <>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </>
);

// Hover state for one box; the popup follows it.
const useHover = () => {
  const [hovered, setHovered] = useState(false);
  return [hovered, { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }];
};

// Keep clicks on a box's own buttons from also selecting the box.
const stopping = (handler) => (event) => {
  event.stopPropagation();
  handler();
};

const PriceBadge = ({ buy, price }) => {
  if (!buy) {
    return <span className="retro-badge retro-badge--unavailable">Not buyable</span>;
  }
  return (
    <span className="retro-badge retro-badge--buyable">
      {price === null || price === undefined ? 'Buyable' : `from ${formatPrice(price)}`}
    </span>
  );
};

PriceBadge.propTypes = {
  buy: PropTypes.bool,
  price: PropTypes.number,
};

PriceBadge.defaultProps = {
  buy: false,
  price: null,
};

const MoleculePopup = ({ smiles, sources }) => (
    <div className="retro-popup">
      <div className="retro-popup__smiles">{smiles}</div>
      {sources.length > 0 ? (
        <table className="retro-popup__sources">
          <thead>
            <tr>
              <th>Source</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              // eslint-disable-next-line no-underscore-dangle
              <tr key={source._id || `${source.source}-${source.ppg}`}>
                <td>{source.source}</td>
                <td>{cheapestPrice({ result: [source] }) === null ? '–' : formatPrice(Number(source.ppg))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="retro-popup__note">No vendor found</div>
      )}
    </div>
  );

MoleculePopup.propTypes = {
  smiles: PropTypes.string.isRequired,
  sources: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const MoleculeNodeBox = ({
  id, type, data, selected
}) => {
  const [hovered, hoverHandlers] = useHover();
  const { onExpand, onToggleFold } = useContext(PredictionFlowContext);
  const isRoot = type === 'root';
  // Only retrosynthesis molecules (type 'custom') can be expanded further.
  const canExpand = type === 'custom' && !data.expanded;

  return (
    <div
      className={classNames('retro-node', {
        'retro-node--root': isRoot,
        'retro-node--buyable': data.buy,
        'retro-node--selected': selected,
      })}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...hoverHandlers}
    >
      <NodeToolbar isVisible={hovered} position={Position.Top}>
        <MoleculePopup smiles={data.smiles} sources={data.buyables?.result || []} />
      </NodeToolbar>
      <NodeHandles />

      {isRoot && <div className="retro-node__label">Target</div>}
      {data.svg && <img className="retro-node__image" src={imageSrc(data.svg)} alt={data.smiles} />}
      <div className="retro-node__smiles">{shortSmiles(data.smiles)}</div>
      <PriceBadge buy={data.buy} price={data.price} />
      {type === 'outcome' && (
        <div className="retro-node__rank">{`#${data.rank} · ${formatPercent(data.prob)}`}</div>
      )}

      {data.expanded && (
        <button
          type="button"
          className="retro-node__toggle"
          title={data.folded ? 'Show this branch' : 'Hide this branch'}
          onClick={stopping(() => onToggleFold(id))}
        >
          <i className={`fa fa-chevron-${data.folded ? 'right' : 'down'}`} aria-hidden="true" />
          {data.folded && <span className="ms-1">{`${data.hiddenCount} hidden`}</span>}
        </button>
      )}
      {canExpand && (
        <button
          type="button"
          className="retro-node__toggle"
          title="Find precursors (or double-click the molecule)"
          onClick={stopping(() => onExpand({ id, type, data }))}
        >
          <i className="fa fa-plus" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

MoleculeNodeBox.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
  selected: PropTypes.bool,
};

MoleculeNodeBox.defaultProps = {
  selected: false,
};

const ReactionNodeBox = ({ data, selected }) => {
  const [hovered, hoverHandlers] = useHover();

  return (
    <div
      className={classNames('retro-reaction', { 'retro-reaction--selected': selected })}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...hoverHandlers}
    >
      <NodeToolbar isVisible={hovered} position={Position.Top}>
        <div className="retro-popup retro-popup--reaction">
          {data.svg && <img src={imageSrc(data.svg)} alt={data.smiles} />}
          <div>
            Plausibility:
            {' '}
            <b>{formatPercent(data.plausibility)}</b>
          </div>
          {data.necessary_reagent && (
            <div>
              Necessary reagent:
              {' '}
              <b>{data.necessary_reagent}</b>
            </div>
          )}
        </div>
      </NodeToolbar>
      <NodeHandles />
      <span className="retro-reaction__rank">{`#${data.rank}`}</span>
      <span className="retro-reaction__score">{formatPercent(data.plausibility)}</span>
    </div>
  );
};

ReactionNodeBox.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
  selected: PropTypes.bool,
};

ReactionNodeBox.defaultProps = {
  selected: false,
};

// Forward synthesis input: one of Reactant / Reagent / Solvent, filled by
// dropping a sample from the element list.
const ForwardInputNodeBox = ({ data }) => {
  const { onDropSample } = useContext(PredictionFlowContext);

  return (
    <div className={classNames('retro-node', 'retro-node--input', { 'retro-node--filled': data.smiles })}>
      <NodeHandles />
      <div className="retro-node__label">{data.label}</div>
      {data.png && <img className="retro-node__image" src={imageSrc(data.png)} alt={data.smiles} />}
      {data.smiles
        ? <div className="retro-node__smiles" title={data.smiles}>{shortSmiles(data.smiles)}</div>
        : <div className="retro-node__smiles">{data.optional ? 'optional' : 'required'}</div>}
      <div className="retro-node__drop nodrag">
        <DropTargetMolecule onChange={(event) => onDropSample(data.label, event)} />
      </div>
    </div>
  );
};

ForwardInputNodeBox.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
};

const SynthesisNodeBox = ({ data }) => (
  <div className={classNames('retro-reaction', 'retro-reaction--synthesis', { 'retro-reaction--ready': data.ready })}>
    <NodeHandles />
    <i className="fa fa-flask" aria-hidden="true" />
    <span className="retro-reaction__score">Synthesis</span>
  </div>
);

SynthesisNodeBox.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
};

const MoleculeNode = memo(MoleculeNodeBox);
const ReactionNode = memo(ReactionNodeBox);
const ForwardInputNode = memo(ForwardInputNodeBox);
const SynthesisNode = memo(SynthesisNodeBox);

export const retroNodeTypes = {
  root: MoleculeNode,
  custom: MoleculeNode,
  reaction: ReactionNode,
};

export const forwardNodeTypes = {
  input: ForwardInputNode,
  synthesis: SynthesisNode,
  outcome: MoleculeNode,
};

// Key to the canvas symbols; `variant` picks the forward or retro entries.
export const PredictionLegend = ({ variant }) => (
  <div className="retro-legend">
    <span>
      <span className="retro-badge retro-badge--buyable">from $/g</span>
      {' '}
      buyable
    </span>
    <span>
      <span className="retro-badge retro-badge--unavailable">Not buyable</span>
    </span>
    {variant === 'retro' ? (
      <>
        <span>
          <span className="retro-reaction retro-reaction--legend">#1</span>
          {' '}
          reaction rank · plausibility
        </span>
        <span>
          <i className="fa fa-plus" aria-hidden="true" />
          {' '}
          find precursors
        </span>
        <span>
          <i className="fa fa-chevron-down" aria-hidden="true" />
          {' '}
          hide / show branch
        </span>
      </>
    ) : (
      <span>
        <span className="retro-node__rank">#1 · 85%</span>
        {' '}
        product rank · probability
      </span>
    )}
  </div>
);

PredictionLegend.propTypes = {
  variant: PropTypes.oneOf(['forward', 'retro']).isRequired,
};
