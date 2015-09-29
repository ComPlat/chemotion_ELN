import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';

const style = {
  cursor: 'move',
  width: 100,
  height: 100
};

const source = {
  beginDrag(props) {
    return props;
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class WellplateContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {wellplate, connectDragSource} = this.props;

    return connectDragSource(
      <div style={style}>
        {wellplate.name}
      </div>,
      {dropEffect: 'copy'}
    );
  }
}

export default DragSource(DragDropItemTypes.WELLPLATE, source, collect)(WellplateContainer);

WellplateContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};