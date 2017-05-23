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

class AttachmentContainer extends Component {
  constructor(props) {
    super(props);
  }

  deleteAttachment(attachment){
    if(confirm('Are you sure?')) {
      InboxActions.deleteAttachment(attachment)
    }
  }

  render() {
    const {connectDragSource, sourceType, attachment} = this.props;

    if(sourceType == DragDropItemTypes.DATA) {
      return connectDragSource(
        <li><span style={{cursor: 'move'}}
          className='text-info fa fa-arrows'>
          <i className="fa fa-file-text" aria-hidden="true">
          &nbsp; {attachment.filename} </i>
          </span>
          <a className="close"
          onClick={() => this.deleteAttachment(attachment)}>&times;</a>
          </li>
          ,
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
