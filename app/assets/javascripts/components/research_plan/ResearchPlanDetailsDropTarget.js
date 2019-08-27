import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { DropTarget } from 'react-dnd'
import DragDropItemTypes from '../DragDropItemTypes'

const spec = {
  drop(props) {
    return {
      index: props.index
    }
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});


class ResearchPlanDetailsDropTarget extends Component {

  render() {
    const {index, connectDropTarget, isOver, canDrop} = this.props

    let className = 'research-plan-field-drop-target'

    if (isOver) {
      className += ' is-over'
    }
    if (canDrop) {
      className += ' can-drop'
    }

    return connectDropTarget(
      <div className={className}>
        <div className="indicator" />
      </div>
    )
  }

};

export default DropTarget(DragDropItemTypes.RESEARCH_PLAN_FIELD, spec, collect)(ResearchPlanDetailsDropTarget);

ResearchPlanDetailsDropTarget.propTypes = {
  index: PropTypes.number
};
