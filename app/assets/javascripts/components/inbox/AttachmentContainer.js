import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import { Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import InboxActions from '../actions/InboxActions';
import DragDropItemTypes from '../DragDropItemTypes';
import Utils from '../utils/Functions';

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
    this.state = {
      deletingTooltip: false,
    };
  }

  deleteAttachment(attachment){
    if(confirm('Are you sure?')) {
      InboxActions.deleteAttachment(attachment)
    }
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { connectDragSource, sourceType, attachment, largerInbox } = this.props;
    if (sourceType !== DragDropItemTypes.DATA && sourceType !== DragDropItemTypes.UNLINKED_DATA) {
      return null;
    }
    const textStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
      cursor: 'move'
    };

    if (largerInbox === true) {
      textStyle.marginTop = '6px';
      textStyle.marginBottom = '6px';
    }

    const trash = (
      <span>
        <i className="fa fa-trash-o" onClick={() => this.toggleTooltip()} style={{ cursor: "pointer" }}>&nbsp;</i>
        {this.state.deletingTooltip ? (
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            Delete this attachment?
            <ButtonGroup>
              <Button
                bsStyle="danger"
                bsSize="xsmall"
                onClick={() => InboxActions.deleteAttachment(attachment)}
              >Yes</Button>
              <Button
                bsStyle="warning"
                bsSize="xsmall"
                onClick={() => this.toggleTooltip()}
              >No</Button>
            </ButtonGroup>
          </Tooltip>
        ) : null}
      </span>
    );
    return connectDragSource(
      <div style={textStyle}>
        &nbsp;&nbsp;
        {trash}
        &nbsp;&nbsp;
        <i className="fa fa-download" onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: "pointer"}}></i>&nbsp;&nbsp;&nbsp;
        <span  className='text-info fa fa-arrows'>
          &nbsp; {attachment.filename}
        </span>
      </div>,
      { dropEffect: 'move' }
    );
  }
}

export default DragSource(props =>
  props.sourceType, dataSource, collectSource)(AttachmentContainer);

AttachmentContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  largerInbox: PropTypes.bool
};

AttachmentContainer.defaultProps = {
  largerInbox: false
};
