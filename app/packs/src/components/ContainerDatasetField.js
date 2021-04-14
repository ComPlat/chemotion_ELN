import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import InboxActions from './actions/InboxActions';
import DragDropItemTypes from './DragDropItemTypes';
import AttachmentFetcher from './fetchers/AttachmentFetcher';

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
    const {dataset_container, onChange} = props;

    switch (itemType) {
      case DragDropItemTypes.DATA:
        dataset_container.attachments.push(item.attachment)
        onChange(dataset_container)
        InboxActions.removeAttachmentFromList(item.attachment)
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        dataset_container.attachments.push(item.attachment)
        InboxActions.removeUnlinkedAttachmentFromList(item.attachment)
        break;
      case DragDropItemTypes.DATASET:
        item.dataset.attachments.forEach(attachment => {
          dataset_container.attachments.push(attachment)
        })
        onChange(dataset_container)
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
    const {readOnly, handleRemove, disabled} = this.props;
    if(!readOnly) {
      return (
        <Button bsSize="xsmall"
                bsStyle="danger"
                onClick={() => handleRemove(dataset_container)}
                disabled={disabled}>
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
    const {connectDropTarget, isOver, canDrop, dataset_container, handleUndo,
            handleModalOpen, disabled} = this.props;

    if(dataset_container.is_deleted){
      return (
        <div><strike>{dataset_container.name}</strike>

            <Button
              className="pull-right"
              bsSize="xsmall"
              bsStyle="danger"
              onClick={() => handleUndo(dataset_container)}
              disabled={disabled}
            >
              <i className="fa fa-undo"></i>
            </Button>

        </div>
      )
    }else{
      return connectDropTarget(
        <div>
        <a style={{cursor: 'pointer'}} onClick={() => handleModalOpen(dataset_container)}>
          {dataset_container.name || 'new'}
        </a>
        <ButtonToolbar className="pull-right">
          <Button bsSize="xsmall" bsStyle="info" onClick={() => AttachmentFetcher.downloadZip(dataset_container.id)}>
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

export default DropTarget([DragDropItemTypes.DATA, DragDropItemTypes.UNLINKED_DATA, DragDropItemTypes.DATASET], dataTarget, collectTarget)(ContainerDatasetField);

ContainerDatasetField.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
