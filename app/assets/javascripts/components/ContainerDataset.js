import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, Table, ListGroup, ListGroupItem, Button, ButtonToolbar} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Utils from './utils/Functions';

import Attachment from './models/Attachment';
import SamplesFetcher from './fetchers/SamplesFetcher';
import AttachmentFetcher from './fetchers/AttachmentFetcher';

export default class Dataset extends Component {
  constructor(props) {
    super();
    let dataset_container = props.dataset_container.clone();
    this.state = {
      dataset_container: dataset_container
    };
  }



  handleInputChange(type, event) {
    const {dataset_container} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        dataset.name = value;
        break;
    }
    this.setState({dataset_container});
  }

  handleFileDrop(files) {
    const {dataset_container} = this.state;

    let attachments = files.map(f => Attachment.fromFile(f))
    dataset_container.attachments = dataset.attachments.concat(attachments)
    let attachment_list = dataset.attachments
    let attach_name = attachment_list[attachment_list.length - 1].name
    attach_name = attach_name.slice(0, -4)
    dataset.name = attach_name

    this.setState({dataset_container});
  }

  handleAttachmentDownload(attachment) {
    if(attachment.preview) {
      Utils.downloadFile({contents: attachment.preview, name: attachment.name});
    }
    else {
      Utils.downloadFile({contents: `/api/v1/samples/download_attachement/${attachment.filename}/?filename=${attachment.name}`, name: attachment.name});
    }
  }

  handleAttachmentRemove(attachments) {
    const {dataset_container} = this.state;
    const index = dataset.attachments.indexOf(attachments);
    dataset.attachments.splice(index, 1);
    this.setState({dataset_container});
  }

  handleSave() {
    const {dataset_container} = this.state;
    const {onChange, onModalHide} = this.props;
    onChange(dataset_container);
    onModalHide();
  }

  attachments() {
    const {dataset_container} = this.state;
    if(dataset_container.attachments.length > 0) {
      return (
        <ListGroup>
        {dataset_container.attachments.map(attachment => {
          return (
            <ListGroupItem key={attachment.id}>
              <Table className="borderless"><tbody>
                <tr>
                  <td rowSpan="2" width="128">
                    <img src={attachment.previewImage} />
                  </td>
                  <td>
                    <a onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: 'pointer'}}>{attachment.name}</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    {this.removeAttachmentButton(attachment)}
                  </td>
                </tr>
              </tbody></Table>
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
    const {readOnly} = this.props;
    if(!readOnly) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove(attachment)}>
          <i className="fa fa-trash-o"></i>
        </Button>
      );
    }
  }

  dropzone() {
    const {readOnly} = this.props;
    if(!readOnly) {
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
    const {readOnly, onModalHide} = this.props;
    return (
      <Row>
        <Col md={6} style={{paddingRight: 0}}>
          <Col md={12} style={{padding: 0}}>
            <FormGroup controlId="datasetName">
              <ControlLabel>Name</ControlLabel>
              <FormControl
                type="text"
                value={dataset_container.name || ''}
                disabled={readOnly}
                onChange={event => this.handleInputChange('name', event)}
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
            <Button bsStyle="warning" onClick={() => this.handleSave()}>Save</Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}
