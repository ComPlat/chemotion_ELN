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

export default class ContainerDataset extends Component {
  constructor(props) {
    super();
    let dataset_container = Object.assign({}, props.dataset_container);
    this.state = {
      dataset_container: dataset_container,
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

  createAttachmentPreviews(dataset_container) {
    const { attachments } = dataset_container;
    const newAttachments = attachments.filter(
      attachment => !attachment.preview
    );

    const updatedAttachments = newAttachments.map(attachment => {
      return attachment.thumb
        ? AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
            result => {
              if (result != null) {
                attachment.preview = `data:image/png;base64,${result}`;
              }
              return attachment;
            }
          )
        : attachment;
    });

    Promise.all(updatedAttachments).then(attachments => {
      dataset_container.attachments = attachments;

      this.setState({
        dataset_container: dataset_container,
      });
    });
  }

  handleInputChange(type, event) {
    const { dataset_container } = this.state;
    const { value } = event.target;
    switch (type) {
      case 'name':
        dataset_container.name = value;
        break;
      case 'instrument':
        dataset_container.extended_metadata['instrument'] = value;
        break;
      case 'description':
        dataset_container.description = value;
        break;
      case 'dataset':
        dataset_container.dataset = value;
        break;
    }
    this.setState({ dataset_container });
  }

  handleDSChange(ds) {
    this.handleInputChange('dataset', { target: { value: ds } });
  }

  handleFileDrop(files) {
    const { dataset_container } = this.state;
    let attachments = files.map(f => Attachment.fromFile(f));
    let first_attach = dataset_container.attachments.length == 0;
    dataset_container.attachments =
      dataset_container.attachments.concat(attachments);
    if (first_attach) {
      let attachment_list = dataset_container.attachments;
      let attach_name = attachment_list[attachment_list.length - 1].filename;
      let splitted = attach_name.split('.');
      if (splitted.length > 1) {
        splitted.splice(-1, 1);
        attach_name = splitted.join('.');
      }
      dataset_container.name = attach_name;
    }
    this.setState({ dataset_container });
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({
      contents: `/api/v1/attachments/${attachment.id}`,
      name: attachment.filename,
    });
  }

  handleAttachmentRemove(attachment) {
    const { dataset_container } = this.state;
    const index = dataset_container.attachments.indexOf(attachment);
    dataset_container.attachments[index].is_deleted = true;
    this.setState({ dataset_container });
  }

  handleAttachmentBackToInbox(attachment) {
    const { onChange } = this.props;
    const { dataset_container } = this.state;
    const index = dataset_container.attachments.indexOf(attachment);
    if (index != -1) {
      InboxActions.backToInbox(attachment);
      dataset_container.attachments.splice(index, 1);
      onChange(dataset_container);
    }
  }

  handleUndo(attachment) {
    const { dataset_container } = this.state;
    const index = dataset_container.attachments.indexOf(attachment);

    dataset_container.attachments[index].is_deleted = false;
    this.setState({ dataset_container });
  }

  handleSave() {
    const { dataset_container } = this.state;
    const { onChange, onModalHide } = this.props;
    onChange(dataset_container);
    onModalHide();
  }

  listGroupItem(attachment) {
    const { disabled } = this.props;
    const preview = attachment.preview ? (
      <tr>
        <td rowSpan="2" width="128">
          <img src={attachment.preview} alt="" />
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
        <Table className="borderless" style={{ marginBottom: 'unset' }}>
          <tbody>
            {preview}
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <strike>{attachment.filename}</strike>
                <br />
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
      <Table className="borderless" style={{ marginBottom: 'unset' }}>
        <tbody>
          {preview}
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <a
                onClick={() => this.handleAttachmentDownload(attachment)}
                style={{ cursor: 'pointer' }}
              >
                {attachment.filename}
              </a>
              <br />
              {this.removeAttachmentButton(attachment)} &nbsp;
              {this.attachmentBackToInboxButton(attachment)}
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  attachments() {
    const { dataset_container } = this.state;
    if (
      dataset_container.attachments &&
      dataset_container.attachments.length > 0
    ) {
      return (
        <div className="list">
          <ListGroup>
            {dataset_container.attachments.map(attachment => {
              return (
                <ListGroupItem
                  key={attachment.id}
                  style={{ margin: 'unset', padding: 'unset' }}
                >
                  {this.listGroupItem(attachment)}
                </ListGroupItem>
              );
            })}
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
          onDrop={files => this.handleFileDrop(files)}
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
    const { dataset_container } = this.state;
    this.setState({
      value: '',
      showInstruments: false,
      instruments: null,
      valueBeforeFocus: null,
      error: '',
    });
    dataset_container.extended_metadata['instrument'] = '';
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
    const debounced = debounce(function (query) {
      return InstrumentsFetcher.fetchInstrumentsForCurrentUser(query);
    }, 200);
    debounced(value)
      .then(result => {
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
      .catch(error => console.log(error));
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
      timeoutReference: setTimeout(function () {
        doneInstrumentTyping();
      }, this.timeout),
    });
    this.handleInputChange('instrument', event);
  }

  selectInstrument() {
    const { dataset_container, timeoutReference, value } = this.state;

    this.setState({
      showInstruments: false,
      valueBeforeFocus: null,
    });

    if (!value || value.trim() === '') {
      this.setState({ value: '' });
      return 0;
    }
    dataset_container.extended_metadata.instrument = value;
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
          {instruments.map((instrument, index) => {
            return (
              <ListGroupItem
                onClick={() => this.selectInstrument()}
                onMouseEnter={() => this.focusInstrument(index)}
                key={'instrument_' + index}
                ref={'instrument_' + index}
                header={instrument.name}
              />
            );
          })}
        </div>
      );
    } else if (error) {
      return <ListGroupItem>{error}</ListGroupItem>;
    }
    return <div />;
  }

  handleAddLink(link) {
    const { dataset_container } = this.state;
    if (dataset_container.extended_metadata['hyperlinks'] == null) {
      dataset_container.extended_metadata['hyperlinks'] = [link];
    } else {
      dataset_container.extended_metadata['hyperlinks'].push(link);
    }
    this.setState({ dataset_container });
  }

  handleRemoveLink(link) {
    const { dataset_container } = this.state;
    var index = dataset_container.extended_metadata['hyperlinks'].indexOf(link);
    if (index !== -1) {
      dataset_container.extended_metadata['hyperlinks'].splice(index, 1);
    }
    this.setState({ dataset_container });
  }

  render() {
    const { dataset_container, showInstruments } = this.state;
    const { readOnly, disabled, kind } = this.props;
    const overlayAttributes = {
      style: {
        position: 'absolute',
        width: 300,
        marginTop: 144,
        marginLeft: 17,
      },
    };
    const termId = absOlsTermId(kind);
    const klasses =
      (UserStore.getState() && UserStore.getState().dsKlasses) || [];
    let klass = {};
    const idx = findIndex(klasses, o => o.ols_term_id === termId);
    if (idx > -1) {
      klass = klasses[idx];
    }

    let genericDS = {};
    if (dataset_container?.dataset?.id) {
      genericDS = dataset_container.dataset;
    } else if (klass.ols_term_id !== undefined) {
      genericDS = GenericDS.buildEmpty(cloneDeep(klass), dataset_container.id);
    }
    return (
      <Row>
        <Col md={6} className="col-base">
          <FormGroup controlId="datasetName">
            <ControlLabel>Name</ControlLabel>
            <FormControl
              type="text"
              value={dataset_container.name || ''}
              disabled={readOnly || disabled}
              onChange={event => this.handleInputChange('name', event)}
            />
          </FormGroup>
          <FormGroup controlId="datasetInstrument">
            <ControlLabel>Instrument</ControlLabel>
            <FormControl
              type="text"
              value={dataset_container.extended_metadata['instrument'] || ''}
              disabled={readOnly || disabled}
              onChange={event =>
                this.handleInstrumentValueChange(
                  event,
                  this.doneInstrumentTyping
                )
              }
              ref={input => {
                this.autoComplete = input;
              }}
              autoComplete="off"
            />
            <Overlay
              placement="bottom"
              style={{
                marginTop: 80,
                width: 398,
                height: 10,
                maxHeight: 20,
              }}
              show={showInstruments}
              container={this}
              rootClose
              onHide={() => this.abortAutoSelection()}
            >
              <ChildOverlay
                dataList={this.renderInstruments()}
                overlayAttributes={overlayAttributes}
              />
            </Overlay>
          </FormGroup>
          <FormGroup controlId="datasetDescription">
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              value={dataset_container.description || ''}
              disabled={readOnly || disabled}
              onChange={event => this.handleInputChange('description', event)}
              rows={4}
            />
          </FormGroup>
        </Col>
        <Col md={6} className="col-full">
          <label>Attachments</label>
          {this.dropzone()}
          {this.attachments()}
          <>
            <HyperLinksSection
              data={dataset_container.extended_metadata['hyperlinks']}
              onAddLink={this.handleAddLink}
              onRemoveLink={this.handleRemoveLink}
              disabled={disabled}
            ></HyperLinksSection>
            <ImageAnnotationModalSVG
              attachment={this.state.choosenAttachment}
              isShow={this.state.imageEditModalShown}
              handleSave={() => {
                let newAnnotation = document
                  .getElementById('svgEditId')
                  .contentWindow.svgEditor.svgCanvas.getSvgString();
                this.state.choosenAttachment.updatedAnnotation = newAnnotation;
                this.setState({ imageEditModalShown: false });
                this.props.onChange(this.props.dataset_container);
              }}
              handleOnClose={() => {
                this.setState({ imageEditModalShown: false });
              }}
            />
          </>
        </Col>
        <Col md={12}>
          <GenericDSDetails
            genericDS={genericDS}
            klass={klass}
            kind={kind}
            onChange={this.handleDSChange}
          />
        </Col>
      </Row>
    );
  }
}
