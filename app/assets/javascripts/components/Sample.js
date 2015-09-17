import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';

let style = {
  width: 100,
  height: 100,
  border: '1px solid black',
  cursor: 'move'
};

const sampleSource = {
  beginDrag(props) {
    return {sample: {
      "id": 1,
      "name": "Sample 1"
    }};
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class Sample extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {name, connectDragSource} = this.props;

    return connectDragSource(<div style={style}>{name}</div>);
  }
}

export default (DragSource(DragDropItemTypes.SAMPLE, sampleSource, collectSource)(Sample));

Sample.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  id: PropTypes.any.isRequired,
  name: PropTypes.string.isRequired,
  //moveSample: PropTypes.func.isRequired
};