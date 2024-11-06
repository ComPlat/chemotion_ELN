import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import { Button, ButtonGroup, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AttachmentContainer from 'src/apps/mydb/inbox/AttachmentContainer';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import { formatDate } from 'src/utilities/timezoneHelper';
import InboxStore from 'src/stores/alt/stores/InboxStore';

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
    const { connectDragSource, sourceType, dataset, largerInbox, isSelected, onDatasetSelect, checkedIds } = this.props;
    const { inboxSize } = InboxStore.getState();

    if (sourceType !== DragDropItemTypes.DATASET) {
      return null;
    }

    const { visible, deletingTooltip } = this.state;
    const attachments = dataset.attachments.map(attachment => (
      <AttachmentContainer
        key={`attach_${attachment.id}`}
        sourceType={DragDropItemTypes.DATA}
        attachment={attachment}
        largerInbox={largerInbox}
        isSelected={checkedIds.includes(attachment.id)}
        checked={isSelected}
      />
    ));
    const attCount = this.attachmentCount();

    const trash = this.props.cache.length === this.props.cache.length // Set it as always show
      && (
      <OverlayTrigger
        show={deletingTooltip}
        animation
        trigger="click"
        placement="bottom"
        overlay={(
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            {`Delete ${attCount} attachment${attCount > 1 ? 's' : ''}?`}
            <ButtonGroup>
              <Button
                variant="danger"
                size="sm"
                onClick={() => this.confirmDeleteDataset()}
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
          className="fa fa-trash-o"
          onClick={() => this.deleteDataset()}
          role="button"
        />
      </OverlayTrigger>
      );
    const datasetCheckbox = (
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onDatasetSelect(dataset.id)}
      />
    );

    return connectDragSource(
      <div>
        <ButtonToolbar className="d-flex align-items-center gap-2 w-100">
          {datasetCheckbox}
          {trash}
          <Button
            variant="link"
            className="p-0 d-flex align-items-center border-0 bg-transparent text-decoration-none"
            onClick={() => this.setState({ visible: !this.state.visible })}
            aria-expanded={visible}
          >
            <i
              className={`fa fa-folder${visible ? '-open' : ''} text-dark`}
            >
              <span className="text-primary fa fa-arrows ms-1" />
            </i>
            <span className="ms-1 text-dark">{dataset.name}</span>
          </Button>

          {
            inboxSize && inboxSize !== 'Small'
            && (
              <span className={`text-dark ms-auto ${largerInbox ? '' : 'none'}`}>
                {formatDate(dataset.created_at)}
              </span>
            )
          }
        </ButtonToolbar>
        {visible
          && <div>{attachments}</div>
        }
      </div>,
      { dropEffect: 'move' }
    );
  }
}

export default DragSource(props => props.sourceType, dataSource, collectSource)(DatasetContainer);

DatasetContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  sourceType: PropTypes.string.isRequired,
  largerInbox: PropTypes.bool,
  isSelected: PropTypes.bool.isRequired,
  onDatasetSelect: PropTypes.func.isRequired,
};

DatasetContainer.defaultProps = {
  largerInbox: false
};
