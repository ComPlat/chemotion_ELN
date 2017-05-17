import React, { Component, PropTypes } from 'react';
import {DragSource} from 'react-dnd';

import DragDropItemTypes from '../DragDropItemTypes';

const dataSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class DatasetContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {connectDragSource, sourceType, dataset} = this.props;
    if(sourceType == DragDropItemTypes.DATASET) {
      return connectDragSource(
        <span style={{cursor: 'move'}}
          className='text-info fa fa-arrows'>
          <i className="fa fa-folder-open" aria-hidden="true">
          &nbsp; {dataset.name}</i> </span>,
        {dropEffect: 'move'}
      );
    }
  }
}

export default DragSource(props => props.sourceType, dataSource,
  collectSource)(DatasetContainer);

DatasetContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
