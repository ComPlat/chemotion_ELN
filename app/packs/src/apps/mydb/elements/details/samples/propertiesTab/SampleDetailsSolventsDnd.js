import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import Sample from 'src/models/Sample';
import { SampleSolventGroup } from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleSolventGroup';

const target = {
  drop(tagProps, monitor) {
    const { dropSample } = tagProps;
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

class SampleDetailsSolventsDnd extends React.Component {
  render() {
    const {
      sample,
      headIndex, materialGroup, deleteMaterial, onChange,
      addDefaultSolvent, dropMaterial, switchEquiv,
      isOver, canDrop, connectDropTarget, dropSample, deleteSolvent, onChangeSolvent
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
        <SampleSolventGroup
          sample={sample}
          dropSample={dropSample}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
          headIndex={headIndex ?? 0}
          materialGroup={materialGroup ?? ''}
          deleteMaterial={deleteMaterial ?? (() => true)}
          onChange={onChange ?? (() => true)}
          addDefaultSolvent={addDefaultSolvent ?? (() => true)}
          dropMaterial={dropMaterial ?? (() => true)}
          switchEquiv={switchEquiv ?? (() => true)}
        />
      </div>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE],
  target,
  collect,
)(SampleDetailsSolventsDnd);

SampleDetailsSolventsDnd.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  headIndex: PropTypes.number,
  onChangeSolvent: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  deleteSolvent: PropTypes.func.isRequired,
};
