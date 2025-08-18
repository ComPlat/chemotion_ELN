/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, OverlayTrigger, Tooltip, Button
} from 'react-bootstrap';
import ContainerDatasetModalContent from 'src/components/container/ContainerDatasetModalContent';
import ContainerActions from 'src/stores/alt/actions/ContainerActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import BaseFetcher from 'src/fetchers/BaseFetcher';

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

    this.onHandleContainerSubmit = this.onHandleContainerSubmit.bind(this);
  }

  handleModalClose(event) {
    if (event && event.type === 'keydown' && event.key === 'Escape') {
      this.handleSave();
    } else {
      this.props.onHide();
    }
  }

  handleSave(shouldClose = false) {
    if (this.datasetInput.current) {
      this.datasetInput.current.setLocalName(this.state.localName);
      this.datasetInput.current.handleSave(shouldClose);
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

  onHandleContainerSubmit = (shouldClose) => {
    const { updateContainerState, rootContainer } = this.props;
    const { attachments } = this.props.datasetContainer;
    LoadingActions.start();
    ContainerActions.updateContainerWithFiles(rootContainer)
      .then((updatedContainer) => {
        updateContainerState(updatedContainer, shouldClose);
        BaseFetcher.updateAnnotationsForAttachments(attachments)
          .then(() => {
            // const updatedAttachments = attachments.map((att) => ({ ...att }));
            // const updatedDatasetContainer = {
            //   ...this.props.datasetContainer,
            //   attachments: updatedAttachments
            // };
            // this.props.onChange(updatedDatasetContainer);
            this.datasetInput?.current?.resetAnnotation();
            LoadingActions.stop();
          })
          .finally(() => {
          });
      })
      .catch((err) => {
        console.warn('Container update failed:', err.message);
      })
      .finally(() => { });
  };

  render() {
    const {
      show, onHide, onChange, readOnly, disabled, kind, datasetContainer, rootContainer,
      isContainerNew
    } = this.props;

    const { mode, instrumentIsEmpty } = this.state;

    const attachmentTooltip = (<Tooltip id="attachment-tooltip">Click to view Attachments</Tooltip>);
    const metadataTooltip = (<Tooltip id="metadata-tooltip">Click to view Metadata</Tooltip>);
    const isNew = !Number.isInteger(rootContainer.id);

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
                    autoFocus={true}
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
              isNew={isNew}
              handleContainerSubmit={this.onHandleContainerSubmit}
            />
          </Modal.Body>
          <Modal.Footer
            className="d-flex justify-content-end align-items-center modal-footer border-0"
          >

            {
              !isNew && !isContainerNew
              && (
                <Button
                  variant="warning"
                  className="align-self-center"
                  onClick={() => this.handleSave(false)}
                >
                  Save Dataset
                </Button>
              )
            }
            <Button
              variant={isNew ? "primary" : "warning"}
              className="align-self-center"
              onClick={() => this.handleSave(true)}
            >
              {isNew ? 'Keep and Close' : 'Save and Close'}
              {' '}
              Dataset
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
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string,
  updateContainerState: PropTypes.func.isRequired,
  rootContainer: PropTypes.shape({
    id: PropTypes.number,
  }).isRequired,
};

ContainerDatasetModal.defaultProps = {
  readOnly: false,
  disabled: false,
  kind: null,
};
