import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import classnames from 'classnames';

const spec = {
  drop(props) {
    return {
      index: props.index
    };
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ResearchPlanDetailsDropTarget extends Component {
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;

    const className = classnames(
      {
        'dnd-zone': canDrop,
        'dnd-zone-over': isOver,
      }
    );

    return connectDropTarget(
      <div className={className} />
    );
  }
}

export default
DropTarget(DragDropItemTypes.RESEARCH_PLAN_FIELD, spec, collect)(ResearchPlanDetailsDropTarget);

ResearchPlanDetailsDropTarget.propTypes = {
  index: PropTypes.number
};
