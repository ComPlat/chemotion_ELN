/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { Accordion } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ArrayUtils from 'src/utilities/ArrayUtils';
import {
  AiHeader,
  AiHeaderDeleted,
  newHeader,
} from 'src/components/generic/GenericContainer';

const orderSource = {
  beginDrag(props) {
    return { container: props.container };
  },
};

const orderTarget = {
  drop(targetProps, monitor) {
    const source = monitor.getItem().container;
    const target = targetProps.container;
    if (source.id !== target.id) {
      targetProps.handleMove(source, target);
    }
  },
};

const orderDragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const orderDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

function OrderRowContent({
  container,
  connectDragSource, connectDropTarget, isDragging, isOver, canDrop,
}) {
  let dndClass = ' border';
  if (canDrop) dndClass = ' dnd-zone';
  if (isOver) dndClass += ' dnd-zone-over';
  if (isDragging) dndClass += ' dnd-dragging';

  return compose(connectDragSource, connectDropTarget)(
    <div className={`d-flex gap-2 mb-3 bg-gray-100 px-2 py-3 rounded${dndClass}`}>
      <div className="dnd-button d-flex align-items-center">
        <i className="dnd-arrow-enable text-info fa fa-arrows" aria-hidden="true" />
      </div>
      {newHeader({ container, mode: 'order' })}
    </div>
  );
}

OrderRowContent.propTypes = {
  container: PropTypes.object.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

const OrderRow = compose(
  DragSource(DragDropItemTypes.CONTAINER, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.CONTAINER, orderTarget, orderDropCollect),
)(OrderRowContent);

function GenericContainerSet(props) {
  const {
    ae,
    readOnly,
    generic,
    fnUndo,
    fnChange,
    fnSelect,
    fnRemove,
    noAct,
    linkedAis,
    handleSubmit,
    activeKey,
    mode,
    handleMove,
  } = props;
  if (ae.length < 1 || ae[0].children.length < 0) return null;
  const sortedChildren = ArrayUtils.sortArrByIndex(ae[0].children);
  const ais = noAct
    ? sortedChildren.filter((x) => linkedAis.includes(x.id))
    : sortedChildren;

  if (mode === 'order') {
    return (
      <div>
        {ais.map((container, key) => (
          <OrderRow
            key={key}
            container={container}
            handleMove={handleMove}
          />
        ))}
      </div>
    );
  }

  return (
    <Accordion
      id="gen_el_analysis_list"
      className="flex-grow-1"
      onSelect={fnSelect}
      activeKey={activeKey}
      alwaysOpen={false}
    >
      {ais.map((container, key) => {
        if (container.is_deleted) {
          return (
            <AiHeaderDeleted
              key={key}
              container={container}
              idx={String(key)}
              fnUndo={fnUndo}
              noAct={noAct}
              readOnly={readOnly}
            />
          );
        }
        return (
          <AiHeader
            key={key}
            container={container}
            idx={String(key)}
            generic={generic}
            readOnly={readOnly}
            fnChange={fnChange}
            fnRemove={fnRemove}
            noAct={noAct}
            handleSubmit={handleSubmit}
          />
        );
      })}
    </Accordion>
  );
}

GenericContainerSet.propTypes = {
  ae: PropTypes.array.isRequired,
  readOnly: PropTypes.bool.isRequired,
  generic: PropTypes.object.isRequired,
  fnChange: PropTypes.func.isRequired,
  fnSelect: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  fnUndo: PropTypes.func,
  fnRemove: PropTypes.func,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array,
  activeKey: PropTypes.string,
  mode: PropTypes.string,
  handleMove: PropTypes.func,
};

GenericContainerSet.defaultProps = {
  fnUndo: () => {},
  fnRemove: () => {},
  noAct: false,
  linkedAis: [],
  activeKey: '0',
  mode: 'edit',
  handleMove: () => {},
};

export default GenericContainerSet;
