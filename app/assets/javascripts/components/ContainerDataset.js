import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, Table, ListGroup, ListGroupItem, Button, ButtonToolbar} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Utils from './utils/Functions';

import Attachment from './models/Attachment';
import SamplesFetcher from './fetchers/SamplesFetcher';
import AttachmentFetcher from './fetchers/AttachmentFetcher';
import Container from './models/Container';

export default class ContainerDataset extends Component {
  constructor(props) {
    super();
    let dataset_container = Object.assign({}, props.dataset_container);
    this.state = {
      dataset_container: dataset_container
    };
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
    dataset_container.attachments = dataset_container.attachments.concat(attachments)
    let attachment_list = dataset_container.attachments
    let attach_name = attachment_list[attachment_list.length - 1].filename
    attach_name = attach_name.slice(0, -4)
    dataset_container.name = attach_name

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
              {this.removeAttachmentButton(attachment)}
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

  render() {
    const {dataset_container} = this.state;
    const {readOnly, onModalHide, disabled} = this.props;
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
          <Col md={12} style={{padding: 0}}>
          <FormGroup controlId="datasetInstrument">
            <ControlLabel>Instrument</ControlLabel>
              <FormControl
                type="text"
                value={dataset_container.extended_metadata['instrument'] || ''}
                disabled={readOnly || disabled}
                onChange={event => this.handleInputChange('instrument', event)}
              />
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
