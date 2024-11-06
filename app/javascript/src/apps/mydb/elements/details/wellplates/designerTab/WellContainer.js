import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Well from 'src/apps/mydb/elements/details/wellplates/designerTab/Well';

const wellSource = {
  beginDrag(props) {
    return props;
  }
};

const wellTarget = {
  canDrop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    let canDrop = true;
    if (itemType == 'sample' && props.well.sample) {
      canDrop = false;
    } else if (itemType == 'well' && !item.well.sample && !props.well.sample) {
      canDrop = false;
    }
    return canDrop;
  },
  drop(props, monitor) {
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
  render() {
    const { isDragging, connectDragSource, connectDropTarget, well, isOver, canDrop, active } = this.props;
    const styleOverrides = {
      backgroundColor: well.color_code || 'white',
    };

    const classes = ['wellplate-well-container']
    if (active) classes.push('active')
    if (well.sample) classes.push('has-sample')
    if (canDrop) classes.push('border-dashed')

    return (
      connectDragSource(connectDropTarget(
        <div className={classes.join(' ')} style={{ ...styleOverrides }}>
          <Well
            active={active}
            label={well.label}
            sample={well.sample}
          />
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
