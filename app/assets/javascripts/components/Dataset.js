import React, {Component} from 'react';
import {Row, Col, Input, Table, ListGroup, ListGroupItem, Button, ButtonToolbar} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Functions from './utils/Functions';
import _ from 'lodash';

export default class Dataset extends Component {
  constructor(props) {
    super();
    this.state = {
      dataset: _.cloneDeep(props.dataset)
    };
  }

  handleInputChange(type, event) {
    const {dataset} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        dataset.name = value;
        break;
      case 'instrument':
        dataset.instrument = value;
        break;
      case 'description':
        dataset.description = value;
        break;
    }
    this.setState({dataset});
  }

  handleFileDrop(files) {
    const {dataset} = this.state;
    dataset.files = dataset.files.concat(files);
    this.setState({dataset});
  }

  handleFileDownload(file) {
    Functions.downloadFile({contents: file.preview, name: file.name});
  }

  handleFileRemove(file) {
    const {dataset} = this.state;
    const fileId = dataset.files.indexOf(file);
    dataset.files.splice(fileId, 1);
    this.setState({dataset});
  }

  handleSave() {
    const {dataset} = this.state;
    const {onChange, onModalHide} = this.props;
    onChange(dataset);
    onModalHide();
  }

  attachements() {
    const {dataset} = this.state;
    if(dataset.files.length > 0) {
      return (
        <ListGroup>
        {dataset.files.map((file, key) => {
          return (
            <ListGroupItem key={key}>
              <a onClick={() => this.handleFileDownload(file)} style={{cursor: 'pointer'}}>{file.name}</a>
              <div className="pull-right">
                {this.removeButton(file)}
              </div>
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

  removeButton(file) {
    const {readOnly} = this.props;
    if(!readOnly) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleFileRemove(file)}>
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
    const {dataset} = this.state;
    const {readOnly, onModalHide} = this.props;
    return (
      <Row>
        <Col md={6} style={{paddingRight: 0}}>
          <Col md={12} style={{padding: 0}}>
            <Input
              type="text"
              label="Name"
              value={dataset.name}
              disabled={readOnly}
              onChange={event => this.handleInputChange('name', event)}
              />
          </Col>
          <Col md={12} style={{padding: 0}}>
            <Input
              type="text"
              label="Instrument"
              value={dataset.instrument}
              disabled={readOnly}
              onChange={event => this.handleInputChange('instrument', event)}
              />
          </Col>
          <Col md={12} style={{padding: 0}}>
            <Input
              type="textarea"
              label="Description"
              value={dataset.description}
              disabled={readOnly}
              onChange={event => this.handleInputChange('description', event)}
              style={{minHeight: 100}}
              />
          </Col>
        </Col>
        <Col md={6}>
          <label>Attachments</label>
          {this.attachements()}
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
