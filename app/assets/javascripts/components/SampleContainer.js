import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Sample from './Sample';

const style = {
  cursor: 'move',
  width: 100,
  height: 100
};

const sampleSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class SampleContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {sample, connectDragSource} = this.props;

    return connectDragSource(
      <div className="sample-container" style={style}>
        <Sample sample={sample}/>
      </div>,
      {dropEffect: 'copy'}
    );
  }
}

export default DragSource(DragDropItemTypes.SAMPLE, sampleSource, collectSource)(SampleContainer);

SampleContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
