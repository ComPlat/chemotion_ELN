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
    const { connectDragSource, connectDropTarget, container } = this.props;

    return (
      compose(connectDragSource, connectDropTarget)(
        <div>
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
