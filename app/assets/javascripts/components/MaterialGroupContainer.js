import React, { Component, PropTypes } from 'react';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import { MaterialGroup } from './MaterialGroup';
import Reaction from './models/Reaction';

const target = {
  drop(props, monitor) {
    const { dropSample, dropMaterial, materialGroup } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'sample') {
      dropSample(item.element, materialGroup);
    } else if (itemType === 'material') {
      dropMaterial(item.material, item.materialGroup, materialGroup);
    }
  },
  canDrop(props, monitor) {
    const { materialGroup } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'material' && item.materialGroup !== materialGroup) {
      return true;
    } else if (itemType === 'sample') {
      return true;
    }
    return false;
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class MaterialGroupContainer extends Component {
  render() {
    const {
      materials, materialGroup, showLoadingColumn, headIndex,
      isOver, canDrop, connectDropTarget,
      deleteMaterial, onChange, reaction, dropSample
    } = this.props;
    const style = {
      padding: '2px 5px'
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }

    return connectDropTarget(
      <div style={style}>
        <MaterialGroup
          reaction={reaction}
          onChange={onChange}
          materials={materials}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={deleteMaterial}
          addDefaultSolvent={dropSample}
          headIndex={headIndex}
        />
      </div>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MATERIAL],
  target,
  collect
)(MaterialGroupContainer);

MaterialGroupContainer.propTypes = {
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  headIndex: PropTypes.number.isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  showLoadingColumn: PropTypes.bool
};

MaterialGroupContainer.defaultProps = {
  showLoadingColumn: false
};
