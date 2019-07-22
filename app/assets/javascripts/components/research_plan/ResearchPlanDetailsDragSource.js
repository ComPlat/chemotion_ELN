import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import DragDropItemTypes from '../DragDropItemTypes';

const spec = {
  beginDrag(props) {
    return {
      index: props.index
    }
  },
  endDrag(props, monitor) {
    let target = monitor.getDropResult()
    props.onDrop(props.index, target.index)
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

class ResearchPlanDetailsDragSource extends Component {
  render() {
    const { connectDragSource, index } = this.props

    return connectDragSource(<span className="fa fa-arrows dnd-arrow-enable text-info drag-source" />)
  }
};

export default DragSource(DragDropItemTypes.RESEARCH_PLAN_FIELD, spec, collect)(ResearchPlanDetailsDragSource)

ResearchPlanDetailsDragSource.propTypes = {
  index: PropTypes.number,
  onChange: PropTypes.func,
};
