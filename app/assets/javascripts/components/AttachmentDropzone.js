import React, {Component, PropTypes} from 'react';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import InboxActions from './actions/InboxActions';

const dataTarget = {
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    if(itemType == DragDropItemTypes.DATA ||
      itemType == DragDropItemTypes.UNLINKED_DATA ||
      itemType == DragDropItemTypes.DATASET){
      return true;
    }
  },

  drop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    const {dataset_container, handleAddWithAttachments} = props;

    switch (itemType) {
      case DragDropItemTypes.DATA:
        handleAddWithAttachments([item.attachment])
        InboxActions.removeAttachmentFromList(item.attachment)
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        handleAddWithAttachments([item.attachment])
        InboxActions.removeUnlinkedAttachmentFromList(item.attachment)
        break;
      case DragDropItemTypes.DATASET:
        handleAddWithAttachments(item.dataset.attachments)
        InboxActions.removeDatasetFromList(item.dataset)
        break;
    }
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class AttachmentDropzone extends Component{
  constructor(props) {
    super(props);
  }

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
        }} />
      );
    }

  render(){
    const {connectDropTarget, isOver, canDrop} = this.props;

    return connectDropTarget(
      <div>
      <i style={{color: 'gray', padding: 2, textAlign: 'center'}}>
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
