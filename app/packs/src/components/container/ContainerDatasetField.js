import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { absOlsTermId } from 'chem-generic-ui';
import { GenericDSMisType } from 'src/apps/generic/Utils';

const dataTarget = {
  canDrop(monitor) {
    const itemType = monitor.getItemType();
    return itemType === DragDropItemTypes.DATA
      || itemType === DragDropItemTypes.UNLINKED_DATA
      || itemType === DragDropItemTypes.DATASET;
  },

  drop(props, monitor) {
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    const { datasetContainer, onChange } = props;

    switch (itemType) {
      case DragDropItemTypes.DATA:
        datasetContainer.attachments.push(item.attachment);
        onChange(datasetContainer);
        InboxActions.removeAttachmentFromList(item.attachment);
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        datasetContainer.attachments.push(item.attachment);
        InboxActions.removeUnlinkedAttachmentFromList(item.attachment);
        break;
      case DragDropItemTypes.DATASET:
        item.dataset.attachments.forEach((attachment) => {
          datasetContainer.attachments.push(attachment);
        });
        onChange(datasetContainer);
        InboxActions.removeDatasetFromList(item.dataset);
        break;
      default:
        console.warn(`Unknown itemType: ${itemType}`);
        break;
    }
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ContainerDatasetField extends Component {
  removeButton(datasetContainer) {
    const { readOnly, handleRemove, disabled } = this.props;
    if (!readOnly) {
      return (
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          onClick={() => handleRemove(datasetContainer)}
          disabled={disabled}
        >
          <i className="fa fa-trash-o" />
        </Button>
      );
    }
    return null;
  }

  static renderOverlay(color) {
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
    const {
      connectDropTarget, isOver, canDrop, datasetContainer, handleUndo, kind,
      handleModalOpen, disabled
    } = this.props;
    if (datasetContainer.is_deleted) {
      return (
        <div>
          <strike>{datasetContainer.name}</strike>

          <Button
            className="pull-right"
            bsSize="xsmall"
            bsStyle="danger"
            onClick={() => handleUndo(datasetContainer)}
            disabled={disabled}
          >
            <i className="fa fa-undo" />
          </Button>

        </div>
      );
    }
    const gdsDownload = (datasetContainer.dataset == null
      || typeof datasetContainer.dataset === 'undefined') ? (<span />) : (
        <OverlayTrigger placement="top" overlay={<Tooltip id="download metadata">download metadata</Tooltip>}>
          <Button
            bsSize="xsmall"
            bsStyle="success"
            onClick={() => AttachmentFetcher.downloadDataset(datasetContainer.id)}
          >
            <i className="fa fa-download" />
          </Button>
        </OverlayTrigger>
      );
    return connectDropTarget(
      <div>
        {datasetContainer.dataset && datasetContainer.dataset.klass_ols !== absOlsTermId(kind)
          ? <GenericDSMisType /> : null}
        <button
          style={{ background: 'none', border: 'none', textDecoration: 'underline' }}
          onClick={() => handleModalOpen(datasetContainer)}
          type="button"
        >
          {datasetContainer.name || 'new'}
        </button>
        <ButtonToolbar className="pull-right">
          {gdsDownload}
          <OverlayTrigger placement="top" overlay={<Tooltip id="download data">download data + metadata</Tooltip>}>
            <Button bsSize="xsmall" bsStyle="info" onClick={() => AttachmentFetcher.downloadZip(datasetContainer.id)}>
              <i className="fa fa-download" />
            </Button>
          </OverlayTrigger>
          {this.removeButton(datasetContainer)}
        </ButtonToolbar>
        {isOver && canDrop && this.renderOverlay('green')}
      </div>
    );
  }
}

ContainerDatasetField.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool,
  handleRemove: PropTypes.func,
  disabled: PropTypes.bool,
  connectDropTarget: PropTypes.func.isRequired,
  datasetContainer: PropTypes.shape({
    is_deleted: PropTypes.bool,
    name: PropTypes.string,
    dataset: PropTypes.object,
    id: PropTypes.number,
  }).isRequired,
  handleUndo: PropTypes.func.isRequired,
  kind: PropTypes.string.isRequired,
  handleModalOpen: PropTypes.func.isRequired,
};

ContainerDatasetField.defaultProps = {
  readOnly: false,
  handleRemove: () => {},
  disabled: false,
};

const dropTargetTypes = [
  DragDropItemTypes.DATA,
  DragDropItemTypes.UNLINKED_DATA,
  DragDropItemTypes.DATASET
];

export default DropTarget(dropTargetTypes, dataTarget, collectTarget)(ContainerDatasetField);
