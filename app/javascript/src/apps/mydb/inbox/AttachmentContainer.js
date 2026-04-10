import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import { Button, ButtonGroup, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Utils from 'src/utilities/Functions';

import MoveToAnalysisButton from 'src/apps/mydb/inbox/MoveToAnalysisButton';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import ArrayUtils from 'src/utilities/ArrayUtils';
import { formatDate } from 'src/utilities/timezoneHelper';

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
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    InboxStore.listen(this.onChange);
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  toggleAttachmentsCheckbox(id) {
    const { checkedIds } = this.state;
    const { isSelected, attachment, sourceType } = this.props;
    const attachmentId = attachment && attachment.id;
    const params = {
      type: false,
      ids: id,
      range: 'child',
      isSelected,
    };

    if (ArrayUtils.isValNotInArray(checkedIds || [], params.ids)) {
      params.type = true;
    }

    if (sourceType === DragDropItemTypes.DATA && attachmentId) {
      InboxActions.checkDeviceAttachments(params);
    } else {
      InboxActions.checkedIds(params);
      InboxActions.checkedAll(params);
    }
  }

  isAttachmentChecked(attachment) {
    const { isSelected } = this.props;
    const { checkedIds } = this.state;
    return (isSelected || ArrayUtils.isValInArray(checkedIds || [], attachment.id));
  }


  render() {
    const {
      connectDragSource,
      sourceType,
      attachment,
      largerInbox,
      fromUnsorted,
    } = this.props;
    const { deletingTooltip } = this.state;
    if (sourceType !== DragDropItemTypes.DATA && sourceType !== DragDropItemTypes.UNLINKED_DATA) {
      return null;
    }
    const { inboxSize } = InboxStore.getState();

    const trash = (
      <OverlayTrigger
        show={deletingTooltip}
        animation
        trigger="click"
        placement="bottom"
        overlay={(
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            Delete this attachment?
            <ButtonGroup>
              <Button
                variant="danger"
                size="sm"
                onClick={() => InboxActions.deleteAttachment(attachment, fromUnsorted)}
              >
                Yes
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => this.toggleTooltip()}
              >
                No
              </Button>
            </ButtonGroup>
          </Tooltip>
        )}
      >
        <i
          className="fa fa-trash-o mt-1"
          onClick={() => this.toggleTooltip()}
          role="button" />
      </OverlayTrigger>
    );

    const attachmentId = attachment.id;
    const checkBox = (
      <input
        type="checkbox"
        checked={this.props.isSelected}
        onChange={() => this.toggleAttachmentsCheckbox(attachmentId)}
      />
    );

    const filenameTooltip = (
      <Tooltip id="filename_tooltip">
        <p>
          {attachment.filename}
        </p>
      </Tooltip>
    );

    return connectDragSource(
      <div className="d-flex align-items-center overflow-hidden p-1">
        <ButtonToolbar className="gap-2">
          {checkBox}
          {trash}
          <i
            className="fa fa-download mt-1"
            onClick={() => handleAttachmentDownload(attachment)}
          />
          {largerInbox && (
            <MoveToAnalysisButton
              attachment={attachment}
              largerInbox={largerInbox}
              sourceType={sourceType}
            />
          )}
          <OverlayTrigger placement="top" overlay={filenameTooltip} >
            <span>
              <i className="text-primary fa fa-arrows mx-1" />
              {attachment.filename}
            </span>
          </OverlayTrigger>
        </ButtonToolbar>
        {
          inboxSize && inboxSize !== 'Small'
          && (
            <span
              className={`text-dark ms-auto ${largerInbox ? '' : 'none'}`}
            >
              {formatDate(attachment.created_at)}
            </span>
          )}
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
  isSelected: PropTypes.bool.isRequired,
};

AttachmentContainer.defaultProps = {
  largerInbox: false,
  sourceType: '',
  fromUnsorted: false
};
