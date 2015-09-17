import React, { PropTypes, Component } from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';

const style = {
  height: 50,
  width: 50,
  borderRadius: 25,
  paddingTop: 7,
  marginLeft: 5,
  marginBottom: 5,
  float: 'left',
  borderWidth: 4,
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: 2,
  cursor: 'move'
};

const wellSource = {
  beginDrag(props) {
    return {id: props.id};
  }
};

const wellTarget = {
  hover(props, monitor) {
    const draggedItemId = monitor.getItem().id;
    const itemType = monitor.getItemType();
    if(draggedItemId !== props.id) {
      if(itemType == 'well'){
        props.moveWell(draggedItemId, props.id);
      }
    }
  },
  canDrop(props, monitor){
    const itemType = monitor.getItemType();
    return (itemType == 'sample' && props.sampleId) ? false : true;
  },
  drop(props, monitor){
    const droppedItemId = monitor.getItem().id;
    const wellId = props.id;
    const itemType = monitor.getItemType();
    if(itemType == 'sample'){
      props.dropSample(droppedItemId, wellId);
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

class Well extends Component{
  render() {
    const {text, isDragging, connectDragSource, connectDropTarget, sampleId, isOver, canDrop} = this.props;
    const active = '#337ab7';
    const info = '#5bc0de';
    let borderStyle = 'solid';
    let opacity = 1;
    let borderColor = 'gray';
    let label = text;
    if(isDragging){
      borderStyle = 'dashed';
      label = '';
      opacity = 0;
    }
    if(!sampleId){
      borderColor = 'lightgray';
    }
    if (isOver && canDrop) {
      borderStyle = 'dashed';
      borderColor = active;
      opacity = 1;
    } else if (canDrop) {
      //borderColor = 'lightgray';
      borderStyle = 'dotted';
    }

    return connectDragSource(connectDropTarget(<div style={{ ...style, borderStyle, borderColor, opacity}}>{label}</div>));
  }
}

export default DropTarget([DragDropItemTypes.WELL, DragDropItemTypes.SAMPLE], wellTarget, collectTarget)(DragSource(DragDropItemTypes.WELL, wellSource, collectSource)(Well));

Well.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  id: PropTypes.any.isRequired,
  text: PropTypes.string.isRequired,
  moveWell: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired
};