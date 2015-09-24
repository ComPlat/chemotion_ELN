import React, {Component, PropTypes} from 'react';
import {DropTarget, DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Material from './Material';

const materialSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

const materialTarget = {
  drop(props, monitor){
    const {dropMaterial, dropSample, materialGroup, material} = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'sample') {
      dropSample(item.sample);
    } else if (itemType == 'material') {
      dropMaterial(item.material, item.materialGroup);
    }
  },
  canDrop(props, monitor){
    const {material, materialGroup} = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (Object.keys(material).length == 0) {
      if (itemType == 'material' && item.materialGroup != materialGroup) {
        return true;
      } else if (itemType == 'sample') {
        return true;
      }
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
    const {material, isOver, isDragging, canDrop, connectDropTarget, connectDragSource, deleteMaterial} = this.props;
    let style = {
      height: 20,
      cursor: 'move'
    };
    if (isDragging) {
      style.opacity = 0;
    }
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      connectDragSource(
        <Material
          material={material}
          style={style}
          deleteMaterial={deleteMaterial}/>
      ));

    //}
  }
}

export default DropTarget([DragDropItemTypes.SAMPLE, DragDropItemTypes.MATERIAL], materialTarget, collectTarget)(DragSource(DragDropItemTypes.MATERIAL, materialSource, collectSource)(MaterialContainer));

MaterialContainer.propTypes = {
  material: PropTypes.object.isRequired,
  dropSample: PropTypes.func,
  dropMaterial: PropTypes.func,
  deleteMaterial: PropTypes.func
};