import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { DragSource } from 'react-dnd';
import { Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import AttachmentContainer from './AttachmentContainer';
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';

const dataSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class DatasetContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      deletingTooltip: false,
    }
  }

  attachmentCount() {
    return (this.props.dataset && this.props.dataset.attachments &&
     this.props.dataset.attachments.length) || 0;
  }

  deleteDataset() {
    if (this.attachmentCount() === 0) {
      InboxActions.deleteContainerLinkUnselected(this.props.dataset);
      InboxActions.deleteContainer(this.props.dataset);
    } else {
      this.toggleTooltip();
    }
  }

  confirmDeleteDataset() {
    InboxActions.deleteContainerLinkUnselected(this.props.dataset);
    InboxActions.deleteContainer(this.props.dataset);
    this.toggleTooltip();
  }

  confirmDeleteAttachments() {
    this.toggleTooltip();
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { connectDragSource, sourceType, dataset, largerInbox } = this.props;

    if (sourceType === DragDropItemTypes.DATASET) {
      const { visible, deletingTooltip } = this.state;
      const attachments = dataset.attachments.map(attachment => (
        <AttachmentContainer
          key={`attach_${attachment.id}`}
          sourceType={DragDropItemTypes.DATA}
          attachment={attachment}
          largerInbox={largerInbox}
        />
      ));
      const attCount = this.attachmentCount();
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

      const trash = this.props.cache.length === this.props.cache.length // Set it as always show
        ? (
          <span>
            <i className="fa fa-trash-o" onClick={() => this.deleteDataset()} style={{ cursor: "pointer" }}>&nbsp;</i>
            {deletingTooltip ? (
              <Tooltip placement="bottom" className="in" id="tooltip-bottom">
                Delete {attCount} attachment{attCount > 1 ? 's' : null }?
                <ButtonGroup>
                  <Button
                    bsStyle="danger"
                    bsSize="xsmall"
                    onClick={() => this.confirmDeleteDataset()}
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
        ) : null;
      return connectDragSource(
        <div>
          <div style={textStyle}>
            <span className="text-info fa fa-arrows">
              &nbsp;{trash}
              <i
                className={`fa fa-folder${visible ? '-open' : ''}`}
                onClick={() => this.setState(prevState => ({ ...prevState, visible: !visible }))}
                style={{ cursor: 'pointer' }}
              >&nbsp; {dataset.name}
              </i>
            </span>
            <span className="text-info" style={{ float: 'right' }} display={largerInbox ? '' : 'none'}>
              {moment(dataset.created_at).format('DD.MM.YYYY HH:mm') }
            </span>
          </div>
          <div>{visible ? attachments : null}</div>
        </div>,
        { dropEffect: 'move' }
      );
    }

    return null;
  }
}

export default DragSource(props => props.sourceType, dataSource, collectSource)(DatasetContainer);

DatasetContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  sourceType: PropTypes.string.isRequired,
  largerInbox: PropTypes.bool
};

DatasetContainer.defaultProps = {
  largerInbox: false
};
