import React, {Component, PropTypes} from 'react';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import InboxActions from './actions/InboxActions';

const dataTarget = {
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    if(itemType == DragDropItemTypes.DATA){
      return true;
    }
  },

  drop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if(itemType == DragDropItemTypes.DATA){
      const {dataset_container, handleAddWithAttachment} = props;
      handleAddWithAttachment(item.attachment)
      InboxActions.removeAttachmentFromList(item.attachment)
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
      <i style={{height: 50, width: '100%', border: '2px dashed lightgray', color: 'gray', padding: 2, textAlign: 'center'}}>
      Drop File for new Dataset.
      {isOver && canDrop && this.renderOverlay('green')}
      </i>
    );
  }
}


export default DropTarget(DragDropItemTypes.DATA, dataTarget, collectTarget)(AttachmentDropzone);

AttachmentDropzone.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
