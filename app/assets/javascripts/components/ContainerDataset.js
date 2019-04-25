import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, Table, ListGroup, ListGroupItem, Button, ButtonToolbar, Overlay } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import debounce from 'es6-promise-debounce';
import Utils from './utils/Functions';

import Attachment from './models/Attachment';
import SamplesFetcher from './fetchers/SamplesFetcher';
import AttachmentFetcher from './fetchers/AttachmentFetcher';
import Container from './models/Container';

import InboxActions from './actions/InboxActions';
import InstrumentsFetcher from './fetchers/InstrumentsFetcher';
import ChildOverlay from './managing_actions/ChildOverlay';

export default class ContainerDataset extends Component {
  constructor(props) {
    super();
    let dataset_container = Object.assign({}, props.dataset_container);
    this.state = {
      dataset_container: dataset_container,
      instruments: null,
      valueBeforeFocus: null,
      timeoutReference: null
    };
    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneInstrumentTyping = this.doneInstrumentTyping.bind(this);
  }

  componentDidMount() {
    this.createAttachmentPreviews(this.state.dataset_container);
  }

  createAttachmentPreviews(dataset_container) {
    const { attachments } = dataset_container;
    let updatedAttachments = attachments.map((attachment) => {
      return attachment.thumb ? AttachmentFetcher.fetchThumbnail({id: attachment.id}).then((result) => {
        if(result != null) {
          attachment.preview = `data:image/png;base64,${result}`;
        }
        return attachment;
      }) : attachment;
    });

    Promise.all(updatedAttachments).then((attachments) => {
      dataset_container.attachments = attachments;

      this.setState({
        dataset_container: dataset_container
      });
    });
  }

 handleInputChange(type, event) {
    const {dataset_container} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        dataset_container.name = value;
        break;
      case 'instrument':
        dataset_container.extended_metadata['instrument'] = value;
        break;
      case 'description':
        dataset_container.description = value;
        break;
    }
    this.setState({dataset_container});
  }


  handleFileDrop(files) {
    const {dataset_container} = this.state;

    let attachments = files.map(f => Attachment.fromFile(f))
    let first_attach = dataset_container.attachments.length == 0
    dataset_container.attachments = dataset_container.attachments.concat(attachments)

    if (first_attach) {
      let attachment_list = dataset_container.attachments
      let attach_name = attachment_list[attachment_list.length - 1].filename
      let splitted = attach_name.split(".")
      if (splitted.length>1) {
        splitted.splice(-1, 1)
        attach_name = splitted.join(".")
      }
      dataset_container.name = attach_name
    }

    this.setState({dataset_container});
  }

  handleAttachmentDownload(attachment) {
      Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
  }

  handleAttachmentRemove(attachment) {
    const {dataset_container} = this.state;
    const index = dataset_container.attachments.indexOf(attachment);

    dataset_container.attachments[index].is_deleted = true;
    this.setState({dataset_container});
  }

  handleAttachmentBackToInbox(attachment) {
    const {onChange} = this.props;
    const {dataset_container} = this.state;
    const index = dataset_container.attachments.indexOf(attachment);

    if(index != -1){
      InboxActions.backToInbox(attachment)
      dataset_container.attachments.splice(index, 1);
      onChange(dataset_container);
    }
  }

  handleUndo(attachment) {
    const {dataset_container} = this.state;
    const index = dataset_container.attachments.indexOf(attachment);

    dataset_container.attachments[index].is_deleted = false;
    this.setState({dataset_container});
  }

  handleSave() {
    const {dataset_container} = this.state;
    const {onChange, onModalHide} = this.props;
    onChange(dataset_container);
    onModalHide();
  }

  listGroupItem(attachment){
    const {disabled} = this.props;
    if(attachment.is_deleted){
      return(
        <Table className="borderless"><tbody>
          <tr>
            <td rowSpan="2" width="128">
              <img src={attachment.preview} />
            </td>
            <td>
              <strike>{attachment.filename}</strike>
            </td>
          </tr>
          <tr>
            <td>
            <Button
              bsSize="xsmall"
              bsStyle="danger"
              onClick={() => this.handleUndo(attachment)}
              disabled={disabled}
            >
              <i className="fa fa-undo"></i>
            </Button>
            </td>
          </tr>
        </tbody></Table>
      );
    }else{
      return(
        <Table className="borderless"><tbody>
          <tr>
            <td rowSpan="2" width="128">
              <img src={attachment.preview} />
            </td>
            <td>
              <a onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: 'pointer'}}>{attachment.filename}</a>
            </td>
          </tr>
          <tr>
            <td>
              {this.removeAttachmentButton(attachment)} &nbsp;
              {this.attachmentBackToInboxButton(attachment)}
            </td>
          </tr>
        </tbody></Table>
      );
    }
  }

  attachments() {
    const {dataset_container} = this.state;
    if(dataset_container.attachments && dataset_container.attachments.length > 0) {
      return (
        <ListGroup>
        {dataset_container.attachments.map(attachment => {
          return (
            <ListGroupItem key={attachment.id}>
              {this.listGroupItem(attachment)}
            </ListGroupItem>
          )
        })}
        </ListGroup>
      )
    } else {
      return (
        <div style={{padding: 5}}>
          There are currently no Datasets.<br/>
        </div>
      )
    }
  }

  removeAttachmentButton(attachment) {
    const {readOnly, disabled} = this.props;
    if(!readOnly && !disabled) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove(attachment)}>
          <i className="fa fa-trash-o"></i>
        </Button>
      );
    }
  }
  attachmentBackToInboxButton(attachment) {
    const {readOnly} = this.props;

    if(!readOnly && !attachment.is_new) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentBackToInbox(attachment)}>
          <i className="fa fa-backward"></i>
        </Button>
      );
    }
  }
  dropzone() {
    const {readOnly, disabled} = this.props;
    if(!readOnly && !disabled) {
      return (
        <Dropzone
          onDrop={files => this.handleFileDrop(files)}
          style={{height: 50, width: '100%', border: '3px dashed lightgray'}}
          >
          <div style={{textAlign: 'center', paddingTop: 12, color: 'gray'}}>
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
      error: ''
    })
    dataset_container.extended_metadata['instrument'] = '';
  }

  doneInstrumentTyping() {
    const { value } = this.state
    if (!value) {
      this.resetInstrumentComponent();
    } else {
      this.fetchInstruments(value);
    }
  }

  fetchInstruments(value, show = true) {
    const debounced = debounce(function (query) {
      return InstrumentsFetcher.fetchInstrumentsForCurrentUser(query)
    }, 200);
    debounced(value).then((result) => {
      const newState = {};
      if (result.length > 0) {
        newState.instruments = result;
        newState.showInstruments = show;
      } else {
        newState.instruments = null;
        newState.error = '';
        newState.showInstruments = false;
      }
      this.setState(newState)
    }).catch(error => console.log(error))
  }

  handleInstrumentValueChange(event, doneInstrumentTyping) {
    const { value } = event.target;
    const { timeoutReference } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
      return;
    }
    if (timeoutReference) {
      clearTimeout(timeoutReference)
    }
    this.setState({
      value,
      timeoutReference: setTimeout(function(){
                                    doneInstrumentTyping()
                                  }, this.timeout)
    })
    this.handleInputChange('instrument', event)
  }

  selectInstrument() {
    const {
      dataset_container,
      timeoutReference,
      value
    } = this.state;

    this.setState({
      showInstruments: false,
      valueBeforeFocus: null
    })

    if (!value || value.trim() === '') {
      this.setState({ value: '' });
      return 0
    }
    dataset_container.extended_metadata.instrument = value;
    clearTimeout(timeoutReference);
    return value;
  }

  focusInstrument(newFocus) {
    const { instruments, valueBeforeFocus } = this.state;
    const newState = {}
    if (!valueBeforeFocus) {
      newState.valueBeforeFocus = instruments[newFocus].name
    }
    newState.value = instruments[newFocus].name
    this.setState(newState);
  }

  abortAutoSelection() {
    const { valueBeforeFocus } = this.state
    this.setState({
      value: valueBeforeFocus,
      valueBeforeFocus: null,
    })
  }

  renderInstruments() {
    const {
      instruments,
      error
    } = this.state

    if (instruments) {
      return (
        <div>
          { instruments.map((instrument, index) => {
            return (
              <ListGroupItem
                onClick={() => this.selectInstrument()}
                onMouseEnter={() => this.focusInstrument(index)}
                key={'instrument_' + index}
                ref={'instrument_' + index}
                header={instrument.name}
              />
            )
          })}
        </div>
      )
    } else if (error) {
      return <ListGroupItem>{error}</ListGroupItem>
    }
    return (
      <div />
    )
  }

  render() {
    const { dataset_container, showInstruments } = this.state;
    const { readOnly, onModalHide, disabled } = this.props;

    const overlayAttributes = {
      style: {
        position: 'absolute',
        width: 300,
        marginTop: 144,
        marginLeft: 17
      }
    };

    return (
      <Row>
        <Col md={6} style={{paddingRight: 0}}>
          <Col md={12} style={{padding: 0}}>
            <FormGroup controlId="datasetName">
              <ControlLabel>Name</ControlLabel>
              <FormControl
                type="text"
                value={dataset_container.name || ''}
                disabled={readOnly || disabled}
                onChange={event => this.handleInputChange('name', event)}
              />
            </FormGroup>
          </Col>
          <Col md={12} style={{ padding: 0 }}>
            <FormGroup controlId="datasetInstrument">
              <ControlLabel>Instrument</ControlLabel>
              <FormControl
                type="text"
                value={dataset_container.extended_metadata['instrument'] || ''}
                disabled={readOnly || disabled}
                onChange={event => this.handleInstrumentValueChange(event,
                  this.doneInstrumentTyping)}
                ref={(input) => { this.autoComplete = input; }}
                autoComplete="off"
              />
              <Overlay
                placement="bottom"
                style={{
                  marginTop: 80, width: 398, height: 10, maxHeight: 20
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
          </Col>
          <Col md={12} style={{padding: 0}}>
            <FormGroup controlId="datasetDescription">
              <ControlLabel>Description</ControlLabel>
              <FormControl
                componentClass="textarea"
                value={dataset_container.description || ''}
                disabled={readOnly || disabled}
                onChange={event => this.handleInputChange('description', event)}
                style={{minHeight: 100}}
              />
            </FormGroup>
          </Col>
        </Col>
        <Col md={6}>
          <label>Attachments</label>
          {this.attachments()}
          {this.dropzone()}
        </Col>
        <Col md={12}>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => onModalHide()}>Close</Button>
            <Button
              bsStyle="warning"
              onClick={() => this.handleSave()}
              disabled={disabled}
            >
              Save
            </Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}
