import React from 'react';
import { DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import DragDropItemTypes from './DragDropItemTypes';
import DetailActions from './actions/DetailActions';

const updRxnOriName = (oriRxn, sourceTag) => {
  const nextRxn = oriRxn;
  nextRxn.origin = sourceTag;
  nextRxn.name = nextRxn.extractNameFromOri(sourceTag);
  nextRxn.changed = true;
  return nextRxn;
};

const gpTarget = {
  drop(targetProps, monitor) {
    const sourceProps = monitor.getItem();
    const source = sourceProps.element;
    const sourceTag = { id: source.id, short_label: source.short_label };
    const oriRxn = targetProps.reaction;
    const nextRxn = updRxnOriName(oriRxn, sourceTag);
    DetailActions.changeCurrentElement(oriRxn, nextRxn);
  },
};

const gpDropCollect = (connect, monitor) => (
  {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
);

const dndStyle = (canDrop, isOver) => {
  const style = {};
  if (canDrop) {
    style.borderStyle = 'dashed';
    style.borderWidth = 2;
    style.opacity = 0.5;
  }
  if (isOver) {
    style.borderColor = '#337ab7';
    style.opacity = 0.2;
  }
  return style;
};

const GpContent = ({ reaction }) => (
  reaction.origin && reaction.origin.short_label
    ? <span className="c-bs-primary gp-content">
      <span className="spacer-10" />
      {reaction.origin.short_label}
    </span>
    : null
);

const GeneralProcedureDnd = ({ connectDropTarget, isOver, canDrop,
  reaction }) => {
  const style = dndStyle(canDrop, isOver);

  return (
    reaction.role === 'parts'
      ? compose(connectDropTarget)(
        <div style={style} className="gp-drop-zone">
          <i className="fa fa-home c-bs-primary gp-icon" />
          <GpContent reaction={reaction} />
        </div>,
      )
      : null
  );
};

export default compose(
  DropTarget(DragDropItemTypes.GENERALPROCEDURE, gpTarget, gpDropCollect),
)(GeneralProcedureDnd);
