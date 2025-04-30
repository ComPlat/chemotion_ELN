/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, OverlayTrigger, Tooltip, Button
} from 'react-bootstrap';
import ContainerDatasetModalContent from 'src/components/container/ContainerDatasetModalContent';

export default class ContainerDatasetModal extends Component {
  constructor(props) {
    super(props);

    this.datasetInput = React.createRef();
    this.state = {
      mode: 'attachments',
      isNameEditing: false,
      localName: props.datasetContainer.name,
      instrumentIsEmpty: !props.datasetContainer.extended_metadata?.instrument,
    };

    this.handleSave = this.handleSave.bind(this);
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
  }

  handleModalClose(event) {
    if (event && event.type === 'keydown' && event.key === 'Escape') {
      this.handleSave();
    } else {
      this.props.onHide();
    }
  }

  handleSave() {
    if (this.datasetInput.current) {
      this.datasetInput.current.setLocalName(this.state.localName);
      this.datasetInput.current.handleSave();
    }
  }

  handleNameChange(newName) {
    this.setState({ localName: newName });
  }

  handleSwitchMode(mode) {
    this.setState({ mode });
  }

  toggleNameEditing = () => {
    this.setState((prevState) => ({
      isNameEditing: !prevState.isNameEditing,
    }));
  };

  render() {
    const {
      show, onHide, onChange, readOnly, disabled, kind, datasetContainer, handleContainerSubmit
    } = this.props;

    const { mode, instrumentIsEmpty } = this.state;

    const attachmentTooltip = (<Tooltip id="attachment-tooltip">Click to view Attachments</Tooltip>);
    const metadataTooltip = (<Tooltip id="metadata-tooltip">Click to view Metadata</Tooltip>);

    const AttachmentsButton = (
      <Button
        variant={mode === 'attachments' ? 'info' : 'light'}
        style={{ backgroundColor: mode !== 'attachments' ? '#E8E8E8' : undefined }}
        onClick={() => this.handleSwitchMode('attachments')}
      >
        Attachments
        <i className="fa fa-paperclip ms-1" aria-hidden="true" />
      </Button>
    );

    const MetadataButton = (
      <Button
        variant={mode === 'metadata' ? 'info' : 'light'}
        onClick={() => this.handleSwitchMode('metadata')}
        style={{ backgroundColor: mode !== 'metadata' ? '#E8E8E8' : undefined }}
      >
        Metadata
        <i className="fa fa-address-card ms-1 border-0" aria-hidden="true" />

      </Button>
    );

    const btnMode = (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (mode === 'attachments') {
            this.handleSwitchMode('metadata');
          } else {
            this.handleSwitchMode('attachments');
          }
        }}
        onKeyPress={() => { }}
      >
        <OverlayTrigger placement="top" overlay={mode === 'metadata' ? attachmentTooltip : metadataTooltip}>
          <div className=" d-inline-block">
            {AttachmentsButton}
            {MetadataButton}
          </div>
        </OverlayTrigger>
      </div>
    );

    if (show) {
      return (
        <Modal
          centered
          show={show}
          size="xl"
          onHide={() => (disabled ? onHide() : this.handleModalClose())}
        >
          <Modal.Header>
            <Modal.Title className="d-flex justify-content-between align-items-center w-100">
              {this.state.isNameEditing ? (
                <div className="d-flex flex-grow-1 align-items-center">
                  <input
                    type="text"
                    value={this.state.localName}
                    onBlur={this.toggleNameEditing}
                    onKeyPress={(event) => {
                      if (event.key === 'Enter') {
                        this.handleNameChange(event.target.value);
                        this.toggleNameEditing();
                      }
                    }}
                    onChange={(e) => { this.handleNameChange(e.target.value); }}
                  />
                </div>
              ) : (
                <div className="d-flex flex-grow-1">
                  <span className="me-2">{this.state.localName}</span>
                  {!readOnly && (
                  <i
                    className="fa fa-pencil text-primary mt-1"
                    aria-hidden="true"
                    onClick={this.toggleNameEditing}
                    role="button"
                  />
                  )}
                  <div className="d-flex align-items-center ms-auto">
                    {mode === 'attachments' && instrumentIsEmpty && (
                    <div className="d-flex align-items-center text-danger me-3">
                      <i className="fa fa-exclamation-triangle me-1" />
                      <span className="fw-bold">
                        Instrument missing, switch to Metadata.
                      </span>
                    </div>
                    )}
                    {btnMode}
                  </div>
                </div>
              )}
            </Modal.Title>

          </Modal.Header>
          <Modal.Body>
            <ContainerDatasetModalContent
              ref={this.datasetInput}
              readOnly={readOnly}
              datasetContainer={datasetContainer}
              kind={kind}
              onModalHide={() => onHide()}
              onChange={onChange}
              mode={mode}
              handleContainerSubmit={handleContainerSubmit}
            />
          </Modal.Body>
          <Modal.Footer
            className="d-flex justify-content-between align-items-center modal-footer border-0"
          >
            <div>
              <small>
                Changes are kept for this session. Remember to save the element itself to persist changes.
              </small>
            </div>
            <Button
              variant="primary"
              className="align-self-center ms-auto"
              onClick={this.handleSave}
            >
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      );
    }
    return null;
  }
}

ContainerDatasetModal.propTypes = {
  show: PropTypes.bool.isRequired,
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
    extended_metadata: PropTypes.shape({
      instrument: PropTypes.string,
    }),
  }).isRequired,
  onHide: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  handleContainerSubmit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string,
};

ContainerDatasetModal.defaultProps = {
  readOnly: false,
  disabled: false,
  kind: null,
};
