import React, {Component, PropTypes} from 'react';
import {Input} from 'react-bootstrap';
import {DropTarget} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Material from './Material';

const materialTarget = {
  drop(props, monitor){
    const {sample} = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'sample') {
      props.dropSample(sample, props.material.id);
    }
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class MaterialContainer extends Component {
  render() {
    const {material, isOver, canDrop, connectDropTarget} = this.props;
    let containerStyle = {
      height: 50
    };
    if (isOver && canDrop) {
      containerStyle.borderStyle = 'dashed';
      containerStyle.borderColor = '#337ab7';
    } else if (canDrop) {
      containerStyle.borderStyle = 'dashed';
    }
    return connectDropTarget(<Material material={material} style={containerStyle}/>);
  }
}

export default DropTarget(DragDropItemTypes.SAMPLE, materialTarget, collectTarget)(MaterialContainer);

MaterialContainer.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  material: PropTypes.object.isRequired
};