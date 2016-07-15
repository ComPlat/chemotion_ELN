import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';

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
    const {connectDragSource, sourceType} = this.props;
    if(sourceType == "") {
      return <span style={ {fontSize: '18pt', cursor: 'not-allowed',
                            color: 'lightgray'}}
                  className='fa fa-arrows'></span>;
    } else {
      return connectDragSource(
        <span style={{fontSize: '18pt', cursor: 'move'}}
          className='text-info fa fa-arrows'></span>,
        {dropEffect: 'copy'}
      );
    }
  }
}

export default DragSource(props => props.sourceType, sampleSource,
  collectSource)(ElementContainer);

ElementContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
