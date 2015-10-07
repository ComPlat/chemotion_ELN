import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';

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

class ElementContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {connectDragSource} = this.props;
    const style = {
      cursor: 'move'
    };
    return connectDragSource(
      <span style={style} className='text-info fa fa-arrows'></span>,
      {dropEffect: 'copy'}
    );
  }
}

export default DragSource(props => props.sourceType, sampleSource, collectSource)(ElementContainer);

ElementContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
