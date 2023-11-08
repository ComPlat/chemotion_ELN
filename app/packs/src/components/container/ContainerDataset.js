/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import {
  Row,
  Col,
  FormGroup,
  FormControl,
  ControlLabel,
  Table,
  ListGroup,
  ListGroupItem,
  Button,
  Overlay,
  Panel,
  Accordion
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import debounce from 'es6-promise-debounce';
import { findIndex, cloneDeep } from 'lodash';
import { absOlsTermId } from 'chem-generic-ui';

import Utils from 'src/utilities/Functions';
import { formatBytes } from 'src/utilities/MathUtils';
import Attachment from 'src/models/Attachment';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericDS from 'src/models/GenericDS';
import GenericDSDetails from 'src/components/generic/GenericDSDetails';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InstrumentsFetcher from 'src/fetchers/InstrumentsFetcher';
import ChildOverlay from 'src/components/managingActions/ChildOverlay';
import HyperLinksSection from 'src/components/common/HyperLinksSection';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import PropTypes from 'prop-types';

export default class ContainerDataset extends Component {
  constructor(props) {
    super();
    const datasetContainer = { ...props.datasetContainer };
    this.state = {
      datasetContainer,
      instruments: null,
      valueBeforeFocus: null,
      timeoutReference: null,
      link: null,
    };

    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneInstrumentTyping = this.doneInstrumentTyping.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
    this.handleDSChange = this.handleDSChange.bind(this);
  }

  handleInputChange(type, event) {
    const { datasetContainer } = this.state;
    const { value } = event.target;

    const updatedDatasetContainer = { ...datasetContainer };

    switch (type) {
      case 'name':
        updatedDatasetContainer.name = value;
        this.props.onNameChange(value);
        break;
      case 'instrument':
        updatedDatasetContainer.extended_metadata = {
          ...updatedDatasetContainer.extended_metadata,
          instrument: value
        };
        break;
      case 'description':
        updatedDatasetContainer.description = value;
        break;
      case 'dataset':
        updatedDatasetContainer.dataset = value;
        break;
      default:
        console.warn(`Unhandled input type: ${type}`);
        break;
    }
    this.setState({ datasetContainer: updatedDatasetContainer });
  }

  handleDSChange(ds) {
    this.handleInputChange('dataset', { target: { value: ds } });
  }

  handleFileDrop(files) {
    const { datasetContainer } = this.state;
    const attachments = files.map((f) => Attachment.fromFile(f));
    const firstAttach = datasetContainer.attachments.length === 0;
    datasetContainer.attachments = datasetContainer.attachments.concat(attachments);
    if (firstAttach) {
      const attachmentList = datasetContainer.attachments;
      let attachName = attachmentList[attachmentList.length - 1].filename;
      const splitted = attachName.split('.');
      if (splitted.length > 1) {
        splitted.splice(-1, 1);
        attachName = splitted.join('.');
      }
      datasetContainer.name = attachName;
    }
    this.setState({ datasetContainer });
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({
      contents: `/api/v1/attachments/${attachment.id}`,
      name: attachment.filename,
    });
  }

  handleAttachmentRemove(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    datasetContainer.attachments[index].is_deleted = true;
    this.setState({ datasetContainer });
  }

  handleAttachmentBackToInbox(attachment) {
    const { onChange } = this.props;
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    if (index !== -1) {
      InboxActions.backToInbox(attachment);
      datasetContainer.attachments.splice(index, 1);
      onChange(datasetContainer);
    }
  }

  handleUndo(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);

    datasetContainer.attachments[index].is_deleted = false;
    this.setState({ datasetContainer });
  }

  handleSave() {
    const { datasetContainer } = this.state;
    const { onChange, onModalHide } = this.props;
    onChange(datasetContainer);
    onModalHide();
  }

  handleInstrumentValueChange(event, doneInstrumentTyping) {
    const { value } = event.target;
    const { timeoutReference } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
      return;
    }
    if (timeoutReference) {
      clearTimeout(timeoutReference);
    }
    this.setState({
      value,
      timeoutReference: setTimeout(() => {
        doneInstrumentTyping();
      }, this.timeout),
    });
    this.handleInputChange('instrument', event);
  }

  handleAddLink(link) {
    const { datasetContainer } = this.state;
    if (datasetContainer.extended_metadata.hyperlinks == null) {
      datasetContainer.extended_metadata.hyperlinks = [link];
    } else {
      datasetContainer.extended_metadata.hyperlinks.push(link);
    }
    this.setState({ datasetContainer });
  }

  handleRemoveLink(link) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.extended_metadata.hyperlinks.indexOf(link);
    if (index !== -1) {
      datasetContainer.extended_metadata.hyperlinks.splice(index, 1);
    }
    this.setState({ datasetContainer });
  }

  createAttachmentPreviews(datasetContainer) {
    const { attachments } = datasetContainer;
    const newAttachments = attachments.filter(
      (attachment) => !attachment.preview
    );

    const updatedAttachments = newAttachments.map((attachment) => (attachment.thumb
      ? AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
        (result) => {
          if (result != null) {
            attachment.preview = `data:image/png;base64,${result}`;
          }
          return attachment;
        }
      )
      : attachment));

    Promise.all(updatedAttachments).then((attachments) => {
      datasetContainer.attachments = attachments;

      this.setState({
        datasetContainer,
      });
    });
  }

  listGroupItem(attachment) {
    const { disabled } = this.props;
    const preview = attachment.preview ? (
      <tr>
        <td rowSpan="2" width="128">
          <img style={{ maxWidth: '100%', height: 'auto', display: 'block' }} src={attachment.preview} alt="" />
        </td>
      </tr>
    ) : (
      <tr>
        <td rowSpan="2" width="128">
          <img style={{ width: '128px', display: 'block' }} alt="" />
        </td>
      </tr>
    );
    if (attachment.is_deleted) {
      return (
        <Table className="borderless" style={{ marginBottom: 'unset', tableLayout: 'fixed' }}>
          <tbody>
            {preview}
            <tr>
              <td>
                <strike>{attachment.filename}</strike>
              </td>
              <td>
                <Button
                  bsSize="xsmall"
                  bsStyle="danger"
                  onClick={() => this.handleUndo(attachment)}
                  disabled={disabled}
                >
                  <i className="fa fa-undo" aria-hidden="true" />
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }
    return (
      <Table className="borderless" style={{ marginBottom: 'unset', tableLayout: 'fixed' }}>
        <tbody>
          {preview}
          <tr>
            <td style={{ wordWrap: 'break-word' }}>
              <button
                onClick={() => this.handleAttachmentDownload(attachment)}
                style={{
                  cursor: 'pointer', border: 'none', background: 'none', padding: 0, margin: 0
                }}
                type="button"
              >
                {attachment.filename}
              </button>
            </td>
            <td style={{ wordWrap: 'break-word' }}><span>{formatBytes(attachment.filesize)}</span></td>
            <td style={{ wordWrap: 'break-word' }}>
              {this.removeAttachmentButton(attachment)}
              {this.attachmentBackToInboxButton(attachment)}
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  attachments() {
    const { datasetContainer } = this.state;
    if (
      datasetContainer.attachments
      && datasetContainer.attachments.length > 0
    ) {
      return (
        <div className="list">
          <ListGroup>
            {datasetContainer.attachments.map((attachment) => (
              <ListGroupItem
                key={attachment.id}
                style={{ margin: 'unset', padding: 'unset' }}
              >
                {this.listGroupItem(attachment)}
              </ListGroupItem>
            ))}
          </ListGroup>
        </div>
      );
    }
    return (
      <div style={{ padding: 15 }}>
        There are currently no Datasets.
        <br />
      </div>
    );
  }

  removeAttachmentButton(attachment) {
    const { readOnly, disabled } = this.props;
    if (!readOnly && !disabled) {
      return (
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          style={{ marginRight: 10 }}
          onClick={() => this.handleAttachmentRemove(attachment)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      );
    }
  }

  attachmentBackToInboxButton(attachment) {
    const { readOnly } = this.props;
    if (!readOnly && !attachment.is_new) {
      return (
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          onClick={() => this.handleAttachmentBackToInbox(attachment)}
        >
          <i className="fa fa-backward" />
        </Button>
      );
    }
  }

  dropzone() {
    const { readOnly, disabled } = this.props;
    if (!readOnly && !disabled) {
      return (
        <Dropzone
          onDrop={(files) => this.handleFileDrop(files)}
          style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
        >
          <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
            Drop Files, or Click to Select.
          </div>
        </Dropzone>
      );
    }
  }

  resetInstrumentComponent() {
    const { datasetContainer } = this.state;
    this.setState({
      value: '',
      showInstruments: false,
      instruments: null,
      valueBeforeFocus: null,
      error: '',
    });
    datasetContainer.extended_metadata.instrument = '';
  }

  doneInstrumentTyping() {
    const { value } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
    } else {
      this.fetchInstruments(value);
    }
  }

  fetchInstruments(value, show = true) {
    const debounced = debounce((query) => InstrumentsFetcher.fetchInstrumentsForCurrentUser(query), 200);
    debounced(value)
      .then((result) => {
        const newState = {};
        if (result.length > 0) {
          newState.instruments = result;
          newState.showInstruments = show;
        } else {
          newState.instruments = null;
          newState.error = '';
          newState.showInstruments = false;
        }
        this.setState(newState);
      })
      .catch((error) => console.log(error));
  }

  selectInstrument() {
    const { datasetContainer, timeoutReference, value } = this.state;

    this.setState({
      showInstruments: false,
      valueBeforeFocus: null,
    });

    if (!value || value.trim() === '') {
      this.setState({ value: '' });
      return 0;
    }
    datasetContainer.extended_metadata.instrument = value;
    clearTimeout(timeoutReference);
    return value;
  }

  focusInstrument(newFocus) {
    const { instruments, valueBeforeFocus } = this.state;
    const newState = {};
    if (!valueBeforeFocus) {
      newState.valueBeforeFocus = instruments[newFocus].name;
    }
    newState.value = instruments[newFocus].name;
    this.setState(newState);
  }

  abortAutoSelection() {
    const { valueBeforeFocus } = this.state;
    this.setState({
      value: valueBeforeFocus,
      valueBeforeFocus: null,
    });
  }

  renderInstruments() {
    const { instruments, error } = this.state;

    if (instruments) {
      return (
        <div>
          {instruments.map((instrument, index) => (
            <ListGroupItem
              onClick={() => this.selectInstrument()}
              onMouseEnter={() => this.focusInstrument(index)}
              key={`instrument_${index}`}
              ref={`instrument_${index}`}
              header={instrument.name}
            />
          ))}
        </div>
      );
    } if (error) {
      return <ListGroupItem>{error}</ListGroupItem>;
    }
    return <div />;
  }

  renderAttachments() {
    const { datasetContainer } = this.state;

    const groupedAttachments = {};
    datasetContainer.attachments.forEach((attachment) => {
      const { filename } = attachment;
      const nameWithoutExtension = filename.replace(/\.[^.]+$/, '');
      // remove .peak format
      const nameWithoutPeak = nameWithoutExtension.replace(/\.peak$/, '');
      if (!groupedAttachments[nameWithoutPeak]) {
        groupedAttachments[nameWithoutPeak] = [];
      }
      groupedAttachments[nameWithoutPeak].push(attachment);
    });

    const attachmentGroups = Object.entries(groupedAttachments).map(([name, attachments]) => (
      <Panel key={name} eventKey={name}>
        <Panel.Heading>
          <Panel.Title toggle>{name}</Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <ListGroup>
              {attachments.map((attachment) => (
                <ListGroupItem key={attachment.id}>
                  {this.listGroupItem(attachment)}
                </ListGroupItem>
              ))}
            </ListGroup>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    ));

    return (
      <>
        {this.dropzone()}
        <Accordion>
          {attachmentGroups}
        </Accordion>

        <HyperLinksSection
          data={this.state.datasetContainer.extended_metadata.hyperlinks}
          onAddLink={this.handleAddLink}
          onRemoveLink={this.handleRemoveLink}
          disabled={this.props.disabled}
        />
        <ImageAnnotationModalSVG
          attachment={this.state.choosenAttachment}
          isShow={this.state.imageEditModalShown}
          handleSave={() => {
            const newAnnotation = document
              .getElementById('svgEditId')
              .contentWindow.svgEditor.svgCanvas.getSvgString();
            this.state.choosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            this.props.onChange(this.props.datasetContainer);
          }}
          handleOnClose={() => {
            this.setState({ imageEditModalShown: false });
          }}
        />
      </>
    );
  }

  renderMetadata() {
    const { datasetContainer, showInstruments } = this.state;
    const { readOnly, disabled, kind } = this.props;
    const termId = absOlsTermId(kind);
    const klasses = (UserStore.getState() && UserStore.getState().dsKlasses) || [];
    let klass = {};
    const idx = findIndex(klasses, (o) => o.ols_term_id === termId);
    if (idx > -1) {
      klass = klasses[idx];
    }

    let genericDS = {};
    if (datasetContainer?.dataset?.id) {
      genericDS = datasetContainer.dataset;
    } else if (klass.ols_term_id !== undefined) {
      genericDS = GenericDS.buildEmpty(cloneDeep(klass), datasetContainer.id);
    }
    return (
      <>
        <FormGroup controlId="datasetName">
          <ControlLabel>Name</ControlLabel>
          <FormControl
            type="text"
            value={datasetContainer.name || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInputChange('name', event)}
          />
        </FormGroup>
        <FormGroup controlId="datasetInstrument">
          <ControlLabel>Instrument</ControlLabel>
          <FormControl
            type="text"
            value={datasetContainer.extended_metadata.instrument || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInstrumentValueChange(
              event,
              this.doneInstrumentTyping
            )}
            ref={(input) => {
              this.autoComplete = input;
            }}
            autoComplete="off"
          />
          <Overlay
            placement="bottom"
            show={showInstruments}
            container={this}
            rootClose
            onHide={() => this.abortAutoSelection()}
          >
            <ChildOverlay
              dataList={this.renderInstruments()}
              overlayAttributes={{
                style: {
                  position: 'absolute',
                  width: 300,
                  marginTop: 144,
                  marginLeft: 17,
                },
              }}
            />
          </Overlay>
        </FormGroup>
        <FormGroup controlId="datasetDescription">
          <ControlLabel>Description</ControlLabel>
          <FormControl
            componentClass="textarea"
            value={datasetContainer.description || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInputChange('description', event)}
            rows={4}
          />
        </FormGroup>
        <GenericDSDetails
          genericDS={genericDS}
          klass={klass}
          kind={kind}
          onChange={this.handleDSChange}
        />
      </>
    );
  }

  render() {
    const { mode } = this.props;

    return (
      <Row>
        <Col md={12}>
          {mode === 'attachments' && this.renderAttachments()}
          {mode === 'metadata' && this.renderMetadata()}
        </Col>
      </Row>
    );
  }
}

ContainerDataset.propTypes = {
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onModalHide: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['attachments', 'metadata']),
};

ContainerDataset.defaultProps = {
  mode: 'attachments',
  disabled: false,
  readOnly: false,
};
