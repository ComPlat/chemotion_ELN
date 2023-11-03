/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, ButtonGroup, OverlayTrigger, Tooltip, Button,
} from 'react-bootstrap';
import ContainerDataset from 'src/components/container/ContainerDataset';

export default class ContainerDatasetModal extends Component {
  constructor(props) {
    super(props);

    this.datasetInput = React.createRef();

    this.state = {
      mode: 'attachments',
      isNameEditing: false,
      originalDatasetContainer: { ...props.datasetContainer },

    };

    this.handleSave = this.handleSave.bind(this);
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
  }

  handleSave() {
    this.datasetInput.current.handleSave();
  }

  handleSwitchMode(mode) {
    this.setState({ mode });
  }

  discardChanges = () => {
    this.props.onChange(this.state.originalDatasetContainer);
    this.props.onHide();
  };

  handleNameChange = (newName) => {
    const { datasetContainer } = this.props;
    datasetContainer.name = newName;
    this.setState({ datasetContainer });
  };

  toggleNameEditing = () => {
    this.setState((prevState) => ({
      isNameEditing: !prevState.isNameEditing,
    }));
  };

  render() {
    const {
      show, onHide, onChange, readOnly, disabled, kind, datasetContainer
    } = this.props;

    const { mode } = this.state;

    const attachmentTooltip = (<Tooltip id="attachment-tooltip">Click to view Attachments</Tooltip>);
    const metadataTooltip = (<Tooltip id="metadata-tooltip">Click to view Metadata</Tooltip>);

    const AttachmentsButton = (
      <Button
        bsStyle={mode === 'attachments' ? 'info' : 'default'}
        style={{
          pointerEvents: 'none',
          backgroundColor: mode !== 'attachments' ? '#E8E8E8' : undefined,
        }}
        onClick={() => this.handleSwitchMode('attachments')}
      >
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
        }}
      >
        <i className="fa fa-database" aria-hidden="true" />

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
          onHide={() => (disabled ? onHide() : this.handleSave())}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxHeight: '95vh',
            minHeight: '95vh',
            overflow: 'hidden'
          }}
        >
          <Modal.Header style={{ flexShrink: 0 }}>
            <Modal.Title style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}
            >
              {this.state.isNameEditing ? (
                <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                  <input
                    type="text"
                    defaultValue={datasetContainer.name}
                    onBlur={this.toggleNameEditing}
                    onKeyPress={(event) => {
                      if (event.key === 'Enter') {
                        this.handleNameChange(event.target.value);
                        this.toggleNameEditing();
                      }
                    }}
                    onChange={(e) => { this.handleNameChange(e.target.value); }}
                    style={{
                      fontWeight: 'bold',
                      color: '#495057',
                      width: '100%',
                      border: 'none',
                      borderBottom: '1px solid #ccc',
                      padding: '2px 0',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                  <span style={{ marginRight: '15px' }}>
                    {datasetContainer.name}
                  </span>
                  {!readOnly && (
                  <i
                    className="fa fa-pencil"
                    aria-hidden="true"
                    onClick={this.toggleNameEditing}
                    style={{ cursor: 'pointer', fontSize: '.8em', color: '#0275d8' }}
                  />
                  )}
                </div>
              )}
              <div>{btnMode}</div>
            </Modal.Title>

          </Modal.Header>
          <Modal.Body style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 270px)', minHeight: 'calc(90vh - 270px)' }}>
            <ContainerDataset
              ref={this.datasetInput}
              readOnly={readOnly}
              datasetContainer={datasetContainer}
              kind={kind}
              onModalHide={() => onHide()}
              onChange={onChange}
              mode={mode}
              onNameChange={this.handleNameChange}
            />
          </Modal.Body>
          <Modal.Footer style={{ flexShrink: 0, width: '100%' }}>
            <Button style={{ marginRight: '5px' }} onClick={this.discardChanges}>
              Discard Changes
            </Button>
            <Button bsStyle="primary" onClick={this.handleSave}>
              Keep Changes
            </Button>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <small>
                Changes are kept for this session. Remember to save the element itself to persist changes.
              </small>
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
  }).isRequired,
  onHide: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string.isRequired,
};

ContainerDatasetModal.defaultProps = {
  readOnly: false,
  disabled: false,
};
