import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import ColoredOverlay from 'src/components/common/ColoredOverlay';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import { targetContainerDataField } from 'src/utilities/DndConst';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { absOlsTermId } from 'chem-generic-ui';
import { GenericDSMisType } from 'src/apps/generic/Utils';

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
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <a style={{ cursor: 'pointer' }} onClick={() => handleModalOpen(datasetContainer)}>
          {datasetContainer.name || 'new'}
        </a>
        <ButtonToolbar className="pull-right">
          {gdsDownload}
          <OverlayTrigger placement="top" overlay={<Tooltip id="download data">download data + metadata</Tooltip>}>
            <Button bsSize="xsmall" bsStyle="info" onClick={() => AttachmentFetcher.downloadZip(datasetContainer.id)}>
              <i className="fa fa-download" />
            </Button>
          </OverlayTrigger>
          {this.removeButton(datasetContainer)}
        </ButtonToolbar>
        {isOver && canDrop && ColoredOverlay({color: 'green'})}
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

export default DropTarget(
  targetContainerDataField.dropTargetTypes,
  targetContainerDataField.dataTarget,
  targetContainerDataField.collectTarget
)(ContainerDatasetField);
