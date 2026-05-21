/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  OverlayTrigger, Tooltip, Button, ButtonGroup, Form
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';
import DatasetModalContent from 'src/components/container/ContainerDatasetModalContent';
import ContainerActions from 'src/stores/alt/actions/ContainerActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class ContainerDatasetModal extends Component {
  constructor(props) {
    super(props);

    this.datasetInput = React.createRef();
    this.state = {
      mode: 'attachments',
      localName: props.datasetContainer.name,
      instrumentIsEmpty: !props.datasetContainer.extended_metadata?.instrument,
      closeOverlayTarget: null,
      closeOverlayPlacement: 'bottom',
    };

    this.handleSave = this.handleSave.bind(this);
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleCloseRequest = this.handleCloseRequest.bind(this);
    this.hideCloseOverlay = this.hideCloseOverlay.bind(this);
    this.handleDiscard = this.handleDiscard.bind(this);

    this.onHandleContainerSubmit = this.onHandleContainerSubmit.bind(this);
  }

  handleModalClose(event) {
    if (event && event.type === 'keydown' && event.key === 'Escape') {
      this.handleCloseRequest(event, 'header');
    } else {
      this.props.onHide();
    }
  }

  handleCloseRequest(event, source) {
    const closeOverlayPlacement = source === 'header' ? 'bottom' : 'top';
    this.setState({
      closeOverlayTarget: event?.currentTarget || null,
      closeOverlayPlacement,
    });
  }

  handleSave() {
    if (this.datasetInput.current) {
      this.datasetInput.current.setLocalName(this.state.localName);
      this.datasetInput.current.handleSave();
    }
  }

  handleDiscard() {
    this.hideCloseOverlay();
    this.props.onHide();
  }

  handleNameChange(newName) {
    this.setState({ localName: newName });
  }

  handleSwitchMode(mode) {
    this.setState({ mode });
  }

  onHandleContainerSubmit = () => {
    const { updateContainerState, rootContainer } = this.props;
    const { attachments } = this.props.datasetContainer;
    LoadingActions.start();
    ContainerActions.updateContainerWithFiles(rootContainer)
      .then((updatedContainer) => {
        updateContainerState(updatedContainer, true);
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

  hideCloseOverlay() {
    this.setState({ closeOverlayTarget: null });
  }

  render() {
    const {
      show, onHide, onChange, readOnly, disabled, kind, datasetContainer, rootContainer, element
    } = this.props;

    const {
      mode, instrumentIsEmpty, closeOverlayTarget, closeOverlayPlacement
    } = this.state;

    const attachmentTooltip = (<Tooltip id="attachment-tooltip">Click to view Attachments</Tooltip>);
    const metadataTooltip = (<Tooltip id="metadata-tooltip">Click to view Metadata</Tooltip>);
    const isNew = !Number.isInteger(rootContainer.id);

    const canSave = !readOnly && !disabled;

    if (show) {
      return (
        <>
          <AppModal
            title="Dataset"
            enforceFocus={false}
            backdrop={false}
            show={show}
            size="lg"
            onHide={this.hideCloseOverlay}
            onRequestClose={this.handleCloseRequest}
            closeLabel="Close"
            primaryActionLabel={canSave ? 'Save' : undefined}
            onPrimaryAction={canSave ? this.handleSave : undefined}
          >
            <div className="d-flex flex-column gap-3 mb-3">
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={this.state.localName}
                  onChange={(e) => { this.handleNameChange(e.target.value); }}
                  disabled={readOnly}
                />
              </Form.Group>
              <div className="d-flex flex-wrap align-items-center gap-3">
                <ButtonGroup>
                  <OverlayTrigger
                    placement="top"
                    overlay={attachmentTooltip}
                  >
                    <Button
                      variant="light"
                      active={mode === 'attachments'}
                      onClick={() => this.handleSwitchMode('attachments')}
                    >
                      Attachments
                      <i className="fa fa-paperclip ms-1" aria-hidden="true" />
                    </Button>
                  </OverlayTrigger>
                  <OverlayTrigger
                    placement="top"
                    overlay={metadataTooltip}
                  >
                    <Button
                      variant="light"
                      active={mode === 'metadata'}
                      onClick={() => this.handleSwitchMode('metadata')}
                    >
                      Metadata
                      <i className="fa fa-address-card ms-1 border-0" aria-hidden="true" />
                    </Button>
                  </OverlayTrigger>
                </ButtonGroup>
                {mode === 'attachments' && instrumentIsEmpty && (
                  <div className="d-flex align-items-center text-danger">
                    <i className="fa fa-exclamation-triangle me-1" />
                    <span className="fw-bold">
                      Instrument missing, switch to Metadata.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DatasetModalContent
              ref={this.datasetInput}
              readOnly={readOnly}
              datasetContainer={datasetContainer}
              element={element}
              kind={kind}
              onModalHide={() => onHide()}
              onChange={onChange}
              mode={mode}
              isNew={isNew}
              handleContainerSubmit={this.onHandleContainerSubmit}
            />
          </AppModal>
          <ConfirmationOverlay
            overlayTarget={closeOverlayTarget}
            placement={closeOverlayPlacement}
            warningText="Closing will discard current changes."
            destructiveAction={this.handleDiscard}
            destructiveActionLabel="Discard"
            hideAction={this.hideCloseOverlay}
            hideActionLabel="Cancel"
          />
        </>
      );
    }
    return null;
  }
}

ContainerDatasetModal.propTypes = {
  show: PropTypes.bool.isRequired,
  datasetContainer: PropTypes.shape({
    attachments: PropTypes.arrayOf(PropTypes.shape({})),
    name: PropTypes.string.isRequired,
    extended_metadata: PropTypes.shape({
      instrument: PropTypes.string,
    }),
  }).isRequired,
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    type: PropTypes.string,
    short_label: PropTypes.string,
  }),
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
  element: {},
};
