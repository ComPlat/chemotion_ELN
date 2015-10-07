import React, { PropTypes, Component } from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Well from './Well';

const wellSource = {
  beginDrag(props) {
    return props;
  }
};

const wellTarget = {
  canDrop(props, monitor){
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    let canDrop = true;
    if (itemType == 'sample' && props.well.sample) {
      canDrop = false;
    } else if (itemType == 'well' && ! item.well.sample && ! props.well.sample) {
      canDrop = false;
    }
    return canDrop;
  },
  drop(props, monitor){
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'sample') {
      props.dropSample(item.element, props.well);
    } else if (itemType == 'well') {
      props.swapWells(item.well, props.well);
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
  componentWillReceiveProps(nextProps) {
    const {active, hideOverlay} = this.props;
    if (active && nextProps.isDragging) {
      hideOverlay();
    }
  }

  render() {
    const {style, isDragging, connectDragSource, connectDropTarget, well, isOver, canDrop, active} = this.props;
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
      cursor: 'move',
      backgroundColor: 'white'
    };
    if (active) {
      containerStyle.backgroundColor = '#337ab7'
    }
    if (isDragging) {
      containerStyle.opacity = 0;
    }
    if (well.sample) {
      containerStyle.borderColor = 'gray';
    }
    if (isOver && canDrop) {
      containerStyle.borderStyle = 'dashed';
      containerStyle.borderColor = '#337ab7';
      containerStyle.opacity = 0;
    } else if (canDrop) {
      containerStyle.borderStyle = 'dashed';
    }

    return (
      connectDragSource(connectDropTarget(
        <div style={{ ...containerStyle, ...style}}>
          <Well sample={well.sample}/>
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
  swapWells: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  well: PropTypes.object
};