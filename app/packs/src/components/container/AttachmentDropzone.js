import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import InboxActions from 'src/stores/alt/actions/InboxActions';

const dataTarget = {
  canDrop(monitor) {
    const itemType = monitor.getItemType();
    if (itemType == DragDropItemTypes.DATA
      || itemType == DragDropItemTypes.UNLINKED_DATA
      || itemType == DragDropItemTypes.DATASET) {
      return true;
    }
    return false;
  },

  drop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    const { handleAddWithAttachments } = props;

    switch (itemType) {
      case DragDropItemTypes.DATA:
        handleAddWithAttachments([item.attachment]);
        InboxActions.removeAttachmentFromList(item.attachment);
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        handleAddWithAttachments([item.attachment]);
        InboxActions.removeUnlinkedAttachmentFromList(item.attachment);
        break;
      case DragDropItemTypes.DATASET:
        handleAddWithAttachments(item.dataset.attachments);
        InboxActions.removeDatasetFromList(item.dataset);
        break;
      default:
        console.warn(`Unhandled itemType: ${itemType}`);
        break;
    }
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class AttachmentDropzone extends Component {
  renderOverlay(color) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        zIndex: 1,
        opacity: 0.5,
        backgroundColor: color,
      }}
      />
    );
  }

  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;

    return connectDropTarget(
      <div>
        <i style={{ color: 'gray', padding: 2, textAlign: 'center' }}>
          Drop File(s) from the inbox
          {isOver && canDrop && this.renderOverlay('green')}
        </i>
      </div>
    );
  }
}

export default DropTarget([DragDropItemTypes.DATA, DragDropItemTypes.UNLINKED_DATA, DragDropItemTypes.DATASET], dataTarget, collectTarget)(AttachmentDropzone);

AttachmentDropzone.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
