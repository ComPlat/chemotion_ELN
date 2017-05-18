import React, {Component, PropTypes} from 'react';
import {Button, ButtonToolbar} from 'react-bootstrap';
import InboxActions from './actions/InboxActions';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';

const dataTarget = {
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    if(itemType == DragDropItemTypes.DATA ||
      itemType == DragDropItemTypes.DATASET){
      return true;
    }
  },

  drop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    const {dataset_container} = props;

    switch (itemType) {
      case DragDropItemTypes.DATA:
        dataset_container.attachments.push(item.attachment)
        InboxActions.removeAttachmentFromList(item.attachment)
        break;
      case DragDropItemTypes.DATASET:
        item.dataset.attachments.forEach(attachment => {
          dataset_container.attachments.push(attachment)
        })
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

class ContainerDatasetField extends Component{

  removeButton(dataset_container) {
    const {readOnly, handleRemove} = this.props;
    if(!readOnly) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => handleRemove(dataset_container)}>
          <i className="fa fa-trash-o"></i>
        </Button>
      );
    }
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

  render() {
    const {connectDropTarget, isOver, canDrop, dataset_container, handleUndo, handleModalOpen} = this.props;

    if(dataset_container.is_deleted){
      return (
        <div><strike>{dataset_container.name}</strike>

            <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => handleUndo(dataset_container)}>
              <i className="fa fa-undo"></i>
            </Button>

        </div>
      )
    }else{
      return connectDropTarget(
        <div>
        <a style={{cursor: 'pointer'}} onClick={() => handleModalOpen(dataset_container)}>
          {dataset_container.name}
        </a>
        <ButtonToolbar className="pull-right">
          <Button bsSize="xsmall" bsStyle="info" onClick={() => alert("zip download not implemented yet.")}>
            <i className="fa fa-download"></i>
          </Button>
          {this.removeButton(dataset_container)}
        </ButtonToolbar>
        {isOver && canDrop && this.renderOverlay('green')}
        </div>
      )
    }
  }
}

export default DropTarget([DragDropItemTypes.DATA, DragDropItemTypes.DATASET], dataTarget, collectTarget)(ContainerDatasetField);

ContainerDatasetField.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
