import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Sample from 'src/models/Sample';
import SampleComponentsGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponentsGroup';

const target = {
  drop(tagProps, monitor) {
    const { dropSample, dropMaterial } = tagProps;
    const srcItem = monitor.getItem();
    const srcType = monitor.getItemType();
    if (srcType === DragDropItemTypes.SAMPLE) {
      dropSample(srcItem.element);
    } else if (srcType === DragDropItemTypes.MOLECULE) {
      dropSample(
        srcItem.element,
        null,
        true,
      );
    } else if (srcType === DragDropItemTypes.MATERIAL) {
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
    const isCorrectType = srcType === DragDropItemTypes.SAMPLE
      || srcType === DragDropItemTypes.MOLECULE;
    return isCorrectType;
  },
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class SampleDetailsComponentsDnd extends React.Component {
  render() {
    const {
      sample,
      headIndex,
      onChangeComponent,
      dropSample,
      dropMaterial,
      deleteMixtureComponent,
      isOver,
      canDrop,
      connectDropTarget,
      lockAmountColumn,
      switchAmount,
    } = this.props;
    const style = {
      padding: '0px 0px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      <div style={style}>
        <SampleComponentsGroup
          sample={sample}
          headIndex={headIndex ?? 0}
          onChange={onChangeComponent}
          dropSample={dropSample}
          dropMaterial={dropMaterial}
          deleteMixtureComponent={deleteMixtureComponent}
          isOver={isOver}
          canDrop={canDrop}
          materialGroup={'components'}
          lockAmountColumn={lockAmountColumn}
          switchAmount={switchAmount}
        />
      </div>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE],
  target,
  collect,
)(SampleDetailsComponentsDnd);

SampleDetailsComponentsDnd.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  headIndex: PropTypes.number,
  onChangeComponent: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  deleteMixtureComponent: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
};
