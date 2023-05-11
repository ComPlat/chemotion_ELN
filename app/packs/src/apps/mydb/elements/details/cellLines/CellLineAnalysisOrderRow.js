import React, { Component } from 'react';
import { Panel } from 'react-bootstrap';
import CellLineAnalysisOrderHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisOrderHeader';
import { DragSource, DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { compose } from 'redux';
import ElementStore from 'src/stores/alt/stores/ElementStore';

const spec = {
  beginDrag(props) {
    return {
      id: props.container.id,
      updateFunction: props.updateFunction
    };
  },
  endDrag(props, monitor) {
    const currentAnalysisContainer = ElementStore.getState().currentElement.container.children[0];
    currentAnalysisContainer.switchPositionOfChildContainer(props.container.id, monitor.getDropResult().id);
    props.updateFunction();
  }

};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const gpTarget = {
  drop(targetProps, monitor) {
    return { id: targetProps.container.id };
  },
  hover(props, monitor) {

  }
};

const gpDropCollect = (connect, monitor) => (
  {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
);

class CellLineAnalysisOrderRow extends Component {
  render() {
    const { connectDragSource, connectDropTarget } = this.props;

    return (
      compose(connectDragSource, connectDropTarget)(
        <div>
          <Panel>
            <Panel.Heading>
              <CellLineAnalysisOrderHeader container={this.props.container} />
            </Panel.Heading>
            <Panel.Body collapsible />
          </Panel>
        </div>
      )
    );
  }
}

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, spec, collect),
  DropTarget(DragDropItemTypes.CONTAINER, gpTarget, gpDropCollect)
)(CellLineAnalysisOrderRow);
