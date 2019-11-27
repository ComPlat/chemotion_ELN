import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from '../DragDropItemTypes';

const fieldTarget = {
  drop(targetProps, monitor) {
    const targetTag = { field: targetProps.field, layerKey: targetProps.layerKey };
    const sourceProps = monitor.getItem();
    console.log('drop--:', sourceProps);
    console.log('drop--:', monitor);
    const sourceTag = { field: sourceProps.field, layerKey: sourceProps.layerKey };
    //if (targetTag.field !== sourceTag.field) {
      targetProps.onDrop({ sourceTag, targetTag });
    //}
  },
  canDrop(targetProps, monitor) {
    //console.log('canDrop--:', monitor.getItem());
    return true;
  },
  hover(props, monitor, component) {
    //console.log('hover--:', monitor.getItem());
  }
};

const fieldDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});


class ElementFieldDropTarget extends Component {
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const className = `editor-field-drop-target${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}`;
    return connectDropTarget(<div className={className}><div className="indicator" />DROP   here</div>);
  }
}

export default DropTarget(
  DragDropItemTypes.ELEMENT_FIELD,
  fieldTarget, fieldDropCollect
)(ElementFieldDropTarget);

ElementFieldDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
