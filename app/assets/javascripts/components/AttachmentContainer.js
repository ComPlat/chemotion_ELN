import React, { Component, PropTypes } from 'react';
import {DragSource} from 'react-dnd';

const dataSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class AttachmentContainer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {connectDragSource, sourceType, attachment} = this.props;
    if(sourceType == "") {
      return <span style={ {cursor: 'not-allowed',
                            color: 'lightgray'}}
                  className='fa fa-arrows'></span>;
    } else {
      return connectDragSource(
        <span style={{cursor: 'move'}}
          className='text-info fa fa-arrows'> {attachment.filename} </span>,
        {dropEffect: 'move'}
      );
    }
  }
}

export default DragSource(props => props.sourceType, dataSource,
  collectSource)(AttachmentContainer);

AttachmentContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
