/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Nav } from 'react-bootstrap';
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
    this.handleCloseRequest = this.handleCloseRequest.bind(this);
    this.hideCloseOverlay = this.hideCloseOverlay.bind(this);
    this.handleDiscard = this.handleDiscard.bind(this);

    this.onHandleContainerSubmit = this.onHandleContainerSubmit.bind(this);
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
    const isNew = !Number.isInteger(rootContainer.id);
    const notification = mode === 'attachments' && instrumentIsEmpty
      ? 'Instrument missing, switch to Metadata.'
      : undefined;

    const canSave = !readOnly && !disabled;

    if (show) {
      return (
        <>
          <AppModal
            title={this.state.localName}
            onChangeTitle={canSave ? (value) => this.handleNameChange(value) : undefined}
            notification={notification}
            notificationType={notification ? 'warning' : undefined}
            enforceFocus={false}
            backdrop={false}
            show={show}
            size="lg"
            dialogClassName="modal-xxxl"
            onHide={this.hideCloseOverlay}
            onRequestClose={this.handleCloseRequest}
            closeLabel="Close"
            primaryActionLabel={canSave ? 'Save' : undefined}
            onPrimaryAction={canSave ? this.handleSave : undefined}
          >
            <div className="d-flex flex-column gap-3">
              <Nav
                variant="tabs"
                activeKey={mode}
                onSelect={(selectedMode) => this.handleSwitchMode(selectedMode)}
              >
                <Nav.Item>
                  <Nav.Link eventKey="attachments">
                    Attachments
                    <i className="fa fa-paperclip ms-1" aria-hidden="true" />
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="metadata">
                    Metadata
                    <i className="fa fa-address-card ms-1 border-0" aria-hidden="true" />
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              {/* Single mode-driven instance so both tabs share one datasetContainer
                  state (all edits are flushed on Save) and the attachment/metadata
                  subtrees are not mounted twice. */}
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
            </div>
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
