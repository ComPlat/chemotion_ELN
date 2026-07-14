import React, { Component } from 'react';
import Header from 'src/apps/mydb/elements/details/cellLines/analysesTab/Header';
import { DragSource, DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { compose } from 'redux';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import PropTypes from 'prop-types';
import Container from 'src/models/Container';

const dragHooks = {

  beginDrag(props) {
    props.startDragFunction();
    return {
      id: props.container.id,
      updateFunction: props.updateFunction
    };
  },
  endDrag(props, monitor) {
    props.endDragFunction();
    if (monitor.getDropResult() == null) {
      return;
    }
    const currentAnalysisContainer = ElementStore.getState().currentElement.container.children[0];
    Container.switchPositionOfChildContainer(
      currentAnalysisContainer.children,
      props.container.id,
      monitor.getDropResult().id
    );
    props.updateFunction(true);
  }

};

const dragCollectHooks = (connect, monitor) => ({

  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const dropHooks = {
  drop(targetProps) {
    return { id: targetProps.container.id };
  },
  hover(props, monitor, component) {
    props.hoverOverItem(component.props.container.id);
  }
};

const dropCollectHooks = (connect, monitor) => (
  {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
);

class OrderModeRow extends Component {
  render() {
    const { connectDragSource, connectDropTarget, container, isDragging } = this.props;
    const dndClass = isDragging ? ' dnd-no-display' : '';

    return (
      compose(connectDragSource, connectDropTarget)(
        <div className={`d-flex gap-2 mb-3 bg-gray-100 px-2 py-3 rounded${dndClass}`}>
          <div className="dnd-button d-flex align-items-center">
            <i className="dnd-arrow-enable text-info fa fa-arrows" aria-hidden="true" />
          </div>
          <Header container={container} />
        </div>
      )
    );
  }
}

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, dragHooks, dragCollectHooks),
  DropTarget(DragDropItemTypes.CONTAINER, dropHooks, dropCollectHooks)
)(OrderModeRow);

OrderModeRow.propTypes = {
  container: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  // eslint-disable-next-line  react/forbid-prop-types
  connectDragSource: PropTypes.any.isRequired,
  // eslint-disable-next-line  react/forbid-prop-types
  connectDropTarget: PropTypes.any.isRequired
};
