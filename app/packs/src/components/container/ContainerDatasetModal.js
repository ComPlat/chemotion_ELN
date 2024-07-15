/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, ButtonGroup, OverlayTrigger, Tooltip, Button,
} from 'react-bootstrap';
import ContainerDatasetModalContent from 'src/components/container/ContainerDatasetModalContent';
import UIActions from 'src/stores/alt/actions/UIActions';
import LoadingStore from 'src/stores/alt/stores/LoadingStore';

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
    this.handleSaveWithoutClose = this.handleSaveWithoutClose.bind(this);
    this.onLoadingStoreChange = this.onLoadingStoreChange.bind(this);
  }

  componentDidMount() {
    LoadingStore.listen(this.onLoadingStoreChange);
  }

  componentWillUnmount() {
    LoadingStore.unlisten(this.onLoadingStoreChange);
  }

  onLoadingStoreChange(state) {
    const { loading } = state;
    if (!loading) {
      UIActions.saveAttachmentDataset.defer('', false, '');
    }
  }

  handleModalClose(event) {
    if (event && event.type === 'keydown' && event.key === 'Escape') {
      this.handleSave();
    } else {
      if (confirm('Changes are kept for this session. Remember to save the element itself to persist changes.')) {
        this.props.onHide();
      }
    }
  }

  handleSave() {
    if (confirm('Changes are kept for this session. Remember to save the element itself to persist changes.')) {
      this.datasetInput.current.handleSave();
      this.props.onChange({
        ...this.props.datasetContainer,
        ...this.datasetInput.current.state.datasetContainer,
        name: this.state.localName
      });
    }
  }

  handleSaveWithoutClose() {
    this.props.onChange({
      ...this.props.datasetContainer,
      ...this.datasetInput.current.state.datasetContainer,
      name: this.state.localName
    });

    const { elementID, templateType } = this.props;
    const datasetID = this.datasetInput.current.state.datasetContainer.id;
    UIActions.saveAttachmentDataset(elementID, templateType, datasetID);
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
      show, onHide, onChange, readOnly, disabled, kind, datasetContainer
    } = this.props;

    const { mode, instrumentIsEmpty } = this.state;

    const attachmentTooltip = (<Tooltip id="attachment-tooltip">Click to view Attachments</Tooltip>);
    const metadataTooltip = (<Tooltip id="metadata-tooltip">Click to view Metadata</Tooltip>);

    const AttachmentsButton = (
      <Button
        bsStyle={mode === 'attachments' ? 'info' : 'default'}
        style={{
          pointerEvents: 'none',
          backgroundColor: mode !== 'attachments' ? '#E8E8E8' : undefined,
          width: '120px'
        }}
        onClick={() => this.handleSwitchMode('attachments')}
      >
        Attachments&nbsp;&nbsp;
        <i className="fa fa-paperclip" aria-hidden="true" />
      </Button>
    );

    const MetadataButton = (
      <Button
        bsStyle={mode === 'metadata' ? 'info' : 'default'}
        onClick={() => this.handleSwitchMode('metadata')}
        style={{
          pointerEvents: 'none',
          backgroundColor: mode !== 'metadata' ? '#E8E8E8' : undefined,
          width: '120px'
        }}
      >
        Metadata&nbsp;&nbsp;
        <i className="fa fa-address-card" aria-hidden="true" />

      </Button>
    );

    const btnMode = (
      <div
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onClick={() => {
          if (mode === 'attachments') {
            this.handleSwitchMode('metadata');
          } else {
            this.handleSwitchMode('attachments');
          }
        }}
        onKeyPress={() => {}}
      >
        <OverlayTrigger placement="top" overlay={mode === 'metadata' ? attachmentTooltip : metadataTooltip}>
          <ButtonGroup>
            {AttachmentsButton}
            {MetadataButton}
          </ButtonGroup>
        </OverlayTrigger>
      </div>
    );

    if (show) {
      return (
        <Modal
          show={show}
          bsSize="large"
          dialogClassName="attachment-modal"
          onHide={() => (disabled ? onHide() : this.handleModalClose())}
        >
          <Modal.Header style={{ flexShrink: 0 }}>
            <Modal.Title>
              {this.state.isNameEditing ? (
                <div className="attachment-name-input-div">
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
                    className="attachment-name-input"
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
                }}
                >
                  <div className="attachment-name-input-div" style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '15px' }}>{this.state.localName}</span>
                    {!readOnly && (
                    <i
                      className="fa fa-pencil"
                      aria-hidden="true"
                      onClick={this.toggleNameEditing}
                      style={{ cursor: 'pointer', fontSize: '.8em', color: '#0275d8' }}
                    />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {mode === 'attachments' && instrumentIsEmpty && (
                    <div style={{ marginRight: '15px', display: 'flex', alignItems: 'center' }}>
                      <i
                        className="fa fa-exclamation-triangle"
                        style={{ color: 'red', fontSize: '1em', marginRight: '5px' }}
                      />
                      <span style={{
                        color: 'red', fontSize: '0.8em', fontWeight: 'bold', flexShrink: 0
                      }}
                      >
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
            />
          </Modal.Body>
          <Modal.Footer style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, width: '100%'
          }}
          >
            {/* <div>
              <small style={{ alignSelf: 'center' }}>
                Changes are kept for this session. Remember to save the element itself to persist changes.
              </small>
            </div> */}
            <div style={{ alignSelf: 'right', marginLeft: 'auto' }}>
              {/* <Button
                style={{ marginRight: '10px' }}
                onClick={this.handleModalClose}
              >
                Discard Changes
              </Button> */}
              <Button
                bsStyle="primary"
                style={{ alignSelf: 'center', marginLeft: 'auto' }}
                onClick={this.handleSaveWithoutClose}
              >
                Save
              </Button>
              <Button
                bsStyle="danger"
                style={{ alignSelf: 'center', marginLeft: '10px' }}
                onClick={this.handleSave}
              >
                Close
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      );
    }
    return <div />;
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
  elementID: PropTypes.string,
  templateType: PropTypes.string,
};

ContainerDatasetModal.defaultProps = {
  readOnly: false,
  disabled: false,
  kind: null,
  elementID: '',
  templateType: '',
};
