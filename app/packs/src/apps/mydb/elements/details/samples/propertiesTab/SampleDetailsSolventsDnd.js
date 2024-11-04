import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Sample from 'src/models/Sample';
import { SampleSolventGroup } from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleSolventGroup';
import classnames from 'classnames';

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
      sample, materialGroup,
      isOver, canDrop, connectDropTarget, dropSample, deleteSolvent, onChangeSolvent
    } = this.props;

    return connectDropTarget(
      <div
        className={classnames({
          'dnd-zone': canDrop,
          'dnd-zone-over': isOver,
        })}
      >
        <SampleSolventGroup
          sample={sample}
          dropSample={dropSample}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
          materialGroup={materialGroup ?? ''}
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
  onChangeSolvent: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  deleteSolvent: PropTypes.func.isRequired,
};
