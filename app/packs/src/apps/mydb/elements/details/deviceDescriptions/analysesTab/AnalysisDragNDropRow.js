import React from 'react';

import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import AnalysisHeader from './AnalysisHeader';
import Container from 'src/models/Container';

const orderSource = {
  beginDrag(props) {
    const { container, deviceDescription } = props;
    return { cId: container.id, dId: deviceDescription.id };
  },
};

const orderTarget = {
  drop(targetProps, monitor) {
    const { container, deviceDescription, handleMove } = targetProps;
    const target = { cId: container.id, dId: deviceDescription.id };
    const source = monitor.getItem();
    if (target.dId === source.dId && target.cId !== source.cId) {
      const currentAnalysisContainer = deviceDescription.container.children[0];
      Container.switchPositionOfChildContainer(
        currentAnalysisContainer.children,
        container.id,
        source.cId
      );
      handleMove(currentAnalysisContainer.children);
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

const AnalysisDragNDropRow = ({
  container, readonly, deviceDescription, connectDragSource, connectDropTarget,
  handleMove, canDrop, isOver, isDragging
}) => {
  const headerClass = container?.is_deleted ? "order-panel-delete" : "order-panel";
  let headerStyle = {};
  if (canDrop) {
    headerStyle.borderStyle = 'dashed';
    headerStyle.borderWidth = 2;
  }
  if (isOver) {
    headerStyle.borderColor = '#337ab7';
  }
  if (isDragging) {
    headerStyle.opacity = 0.2;
  }

  return (
    compose(connectDragSource, connectDropTarget)(
      <div className={headerClass} style={headerStyle}>
        <div className="dnd-btn">
          <span className="text-info fa fa-arrows" />
        </div>
        <AnalysisHeader container={container} readonly={readonly} />
      </div>
    )
  );
}

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.CONTAINER, orderTarget, orderDropCollect)
)(AnalysisDragNDropRow);
