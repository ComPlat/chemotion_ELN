import React, { Component, PropTypes } from 'react';
import {DragSource} from 'react-dnd';
import InboxActions from '../actions/InboxActions';
import DragDropItemTypes from '../DragDropItemTypes';
import Utils from '../utils/Functions';
import Attachment from '../models/Attachment';

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

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }

  render() {
    const {connectDragSource, sourceType, attachment} = this.props;
    let textStyle = {
      display: "block", whiteSpace: "nowrap", overflow: "hidden",
      textOverflow: "ellipsis", maxWidth: "100%", cursor: 'move'
    }
    if(sourceType == DragDropItemTypes.DATA ||
    sourceType == DragDropItemTypes.UNLINKED_DATA) {
      return connectDragSource(
        <div style={textStyle}>
          &nbsp;&nbsp;<i className="fa fa-trash-o" onClick={() => this.deleteAttachment(attachment)} style={{cursor: "pointer"}}></i>&nbsp;&nbsp;
          <i className="fa fa-download" onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: "pointer"}}></i>&nbsp;&nbsp;&nbsp;
          <span  className='text-info fa fa-arrows'>
            &nbsp; {attachment.filename}
          </span>
        </div>
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
