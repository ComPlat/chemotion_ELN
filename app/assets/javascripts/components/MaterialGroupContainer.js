import React, { Component, PropTypes } from 'react';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import { MaterialGroup } from './MaterialGroup';
import Reaction from './models/Reaction';

const target = {
  drop(tagProps, monitor) {
    const { dropSample, dropMaterial } = tagProps;
    const srcItem = monitor.getItem();
    const srcType = monitor.getItemType();

    if (srcType === 'sample') {
      dropSample(
        srcItem.element,
        tagProps.material,
        tagProps.materialGroup,
      );
    } else if (srcType === 'material') {
      dropMaterial(
        srcItem.material,
        srcItem.materialGroup,
        tagProps.material,
        tagProps.materialGroup,
      );
    }
  },
  canDrop(tagProps, monitor) {
    const srcType = monitor.getItemType();
    const isCorrectType = srcType === 'material' || srcType === 'sample';
    const noMaterial = tagProps.materials.length === 0;
    return noMaterial && isCorrectType;
  },
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

class MaterialGroupContainer extends Component {
  render() {
    const {
      materials, materialGroup, showLoadingColumn, headIndex,
      isOver, canDrop, connectDropTarget,
      deleteMaterial, onChange, reaction, dropSample, dropMaterial,
    } = this.props;
    const style = {
      padding: '2px 5px',
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
          dropSample={dropSample}
          dropMaterial={dropMaterial}
          headIndex={headIndex}
        />
      </div>,
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MATERIAL],
  target,
  collect,
)(MaterialGroupContainer);

MaterialGroupContainer.propTypes = {
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  headIndex: PropTypes.number.isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  showLoadingColumn: PropTypes.bool,
  isOver: PropTypes.func.isRequired,
  canDrop: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
};

MaterialGroupContainer.defaultProps = {
  showLoadingColumn: false,
};
