import React, { Component } from 'react';
import { Panel } from 'react-bootstrap';
import CellLineAnalysisOrderHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisOrderHeader';
import { DragSource, DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { compose } from 'redux';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import PropTypes from 'prop-types';

const dragHooks = {
  beginDrag(props) {
    return {
      id: props.container.id,
      updateFunction: props.updateFunction
    };
  },
  endDrag(props, monitor) {
    if (monitor.getDropResult() == null) {
      return;
    }
    const currentAnalysisContainer = ElementStore.getState().currentElement.container.children[0];
    currentAnalysisContainer.switchPositionOfChildContainer(
      props.container.id,
      monitor.getDropResult().id
    );
    props.updateFunction();
  }

};

const dragCollectHooks = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const dropHooks = {
  drop(targetProps) {
    return { id: targetProps.container.id };
  }
};

const dropCollectHooks = (connect, monitor) => (
  {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
);

class CellLineAnalysisOrderRow extends Component {
  render() {
    const { connectDragSource, connectDropTarget, container } = this.props;

    return (
      compose(connectDragSource, connectDropTarget)(
        <div>
          <Panel>
            <Panel.Heading>
              <CellLineAnalysisOrderHeader container={container} />
            </Panel.Heading>
            <Panel.Body collapsible />
          </Panel>
        </div>
      )
    );
  }
}

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, dragHooks, dragCollectHooks),
  DropTarget(DragDropItemTypes.CONTAINER, dropHooks, dropCollectHooks)
)(CellLineAnalysisOrderRow);

CellLineAnalysisOrderRow.propTypes = {
  container: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired
  })).isRequired,
  // eslint-disable-next-line  react/forbid-prop-types
  connectDragSource: PropTypes.any.isRequired,
  // eslint-disable-next-line  react/forbid-prop-types
  connectDropTarget: PropTypes.any.isRequired
};
