import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { DragSource } from 'react-dnd';
import { Button, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import Utils from 'src/utilities/Functions';

import MoveToAnalysisButton from 'src/apps/mydb/inbox/MoveToAnalysisButton';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import ArrayUtils from 'src/utilities/ArrayUtils';

const dataSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

const handleAttachmentDownload = attachment => Utils.downloadFile({
  contents: `/api/v1/attachments/${attachment && attachment.id}`, name: attachment && attachment.filename
});

class AttachmentContainer extends Component {
  constructor(props) {
    super(props);
    const inboxState = InboxStore.getState();
    this.state = {
      deletingTooltip: false,
      checkedIds: inboxState.checkedIds

    };
    this.toggleAttachmentsCheckbox = this.toggleAttachmentsCheckbox.bind(this);
    this.isAttachmentChecked = this.isAttachmentChecked.bind(this);
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  toggleAttachmentsCheckbox(id) {
    const { checkedIds } = this.state;
    const params = {
      type: false,
      ids: id,
      range: 'child'
    };

    if (ArrayUtils.isValNotInArray(checkedIds || [], params.ids)) {
      params.type = true;
    }
    InboxActions.checkedIds(params);
    InboxActions.checkedAll(params);
  }

  isAttachmentChecked(attachment) {
    const { checkedIds } = this.state;
    return (ArrayUtils.isValInArray(checkedIds || [], attachment.id));
  }


  render() {
    const {
      connectDragSource,
      sourceType,
      attachment,
      largerInbox,
      fromUnsorted,
    } = this.props;
    if (sourceType !== DragDropItemTypes.DATA && sourceType !== DragDropItemTypes.UNLINKED_DATA) {
      return null;
    }

    const textStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'clip',
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
                onClick={() => InboxActions.deleteAttachment(attachment, fromUnsorted)}
              >
                Yes
              </Button>
              <Button
                bsStyle="warning"
                bsSize="xsmall"
                onClick={() => this.toggleTooltip()}
              >
                No
              </Button>
            </ButtonGroup>
          </Tooltip>
        ) : null}
      </span>
    );

    const attachmentId = attachment.id;
    const checkBox = (
      <input
        type="checkbox"
        checked={this.isAttachmentChecked(attachment)}
        onChange={() => this.toggleAttachmentsCheckbox(attachmentId)}
      />
    );

    const filenameTooltip = (
      <Tooltip
        id="filename_tooltip"
        className="tooltip"
        style={{ maxWidth: '100%' }}
      >
        <p>
          {attachment.filename}
        </p>
      </Tooltip>);

    return connectDragSource(
      <div style={textStyle}>
        {checkBox}
        &nbsp;&nbsp;{trash}&nbsp;
        <i className="fa fa-download" onClick={() => handleAttachmentDownload(attachment)} style={{ cursor: 'pointer' }} />
        &nbsp;&nbsp;
        {largerInbox ? (
          <MoveToAnalysisButton
            attachment={attachment}
            largerInbox={largerInbox}
            sourceType={sourceType}
          />
        ) : null}
        <OverlayTrigger placement="top" overlay={filenameTooltip} >
          <span>
            <span
              className="text-info fa fa-arrows"
              style={{ maxWidth: '100%', marginRight: '8px' }}
            />
            {attachment.filename}
          </span>
        </OverlayTrigger>
        <span className="text-info" style={{ float: 'right', display: largerInbox ? '' : 'none' }}>
          {moment(attachment.created_at).format('DD.MM.YYYY HH:mm')}
        </span>
      </div>,
      { dropEffect: 'move' }
    );
  }
}

export default DragSource(
  props => props.sourceType,
  dataSource,
  collectSource
)(AttachmentContainer);

AttachmentContainer.propTypes = {
  attachment: PropTypes.object.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  largerInbox: PropTypes.bool,
  sourceType: PropTypes.string,
  fromUnsorted: PropTypes.bool,
};

AttachmentContainer.defaultProps = {
  largerInbox: false,
  sourceType: '',
  fromUnsorted: false
};
