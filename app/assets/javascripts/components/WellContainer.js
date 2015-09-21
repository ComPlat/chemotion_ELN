import React, { PropTypes, Component } from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Well from './Well';

const wellSource = {
  beginDrag(props) {
    return {id: props.id};
  }
};

const wellTarget = {
  hover(props, monitor) {
    const draggedItemId = monitor.getItem().id;
    const itemType = monitor.getItemType();
    if (draggedItemId !== props.id) {
      if (itemType == 'well') {
        props.switchWellContainers(draggedItemId, props.id);
      }
    }
  },
  canDrop(props, monitor){
    const itemType = monitor.getItemType();
    return (itemType == 'sample' && props.well) ? false : true;
  },
  drop(props, monitor){
    const {sample} = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'sample') {
      props.dropSample(sample, props.id);
    }
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class WellContainer extends Component {
  render() {
    const {style, isDragging, connectDragSource, connectDropTarget, well, isOver, canDrop} = this.props;
    const containerStyle = {
      paddingTop: 9,
      borderRadius: '50%',
      float: 'left',
      borderWidth: 4,
      borderStyle: 'solid',
      borderColor: 'lightgray',
      textAlign: 'center',
      verticalAlign: 'middle',
      lineHeight: 2,
      cursor: 'move'
    };
    let hasLabel = false;
    if (isDragging) {
      containerStyle.borderStyle = 'dashed';
      containerStyle.opacity = 0;
    }
    if (well) {
      containerStyle.borderColor = 'gray';
      hasLabel = true;
    }
    if (isOver && canDrop) {
      containerStyle.borderStyle = 'dashed';
      containerStyle.borderColor = '#337ab7';
      containerStyle.opacity = 1;
      hasLabel = false;
    } else if (canDrop) {
      containerStyle.borderStyle = 'dotted';
    }
    return (
      connectDragSource(connectDropTarget(
        <div style={{ ...containerStyle, ...style}}>
          <Well well={well} hasLabel={hasLabel}/>
        </div>
      ))
    );
  }
}

export default DropTarget([DragDropItemTypes.WELL, DragDropItemTypes.SAMPLE], wellTarget, collectTarget)(DragSource(DragDropItemTypes.WELL, wellSource, collectSource)(WellContainer));

WellContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  id: PropTypes.number.isRequired,
  switchWellContainers: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired
};