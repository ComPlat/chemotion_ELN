import React, {Component} from 'react';
import {Row, Col, Input, Table, ListGroup, ListGroupItem, Button, ButtonToolbar} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Functions from './utils/Functions';

export default class Dataset extends Component {
  constructor(props) {
    super(props);
    const {dataset} = props;
    this.state = {
      dataset
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

  onDrop(files) {
    const {dataset} = this.state;
    dataset.files = dataset.files.concat(files);
    this.setState({dataset});
  }

  download(file) {
    Functions.downloadFile({contents: file.preview, name: file.name});
  }

  removeFile(file) {
    const {dataset} = this.state;
    const fileId = dataset.files.indexOf(file);
    dataset.files.splice(fileId, 1);
    this.setState({dataset});
  }

  render() {
    const {dataset} = this.state;
    return (
      <div>
        <Col md={6}>
          <Row>
            <Input
              type="text"
              label="Name"
              value={dataset.name}
              onChange={event => this.handleInputChange('name', event)}
              />
          </Row>
          <Row>
            <Input
              type="text"
              label="Instrument"
              value={dataset.instrument}
              onChange={event => this.handleInputChange('instrument', event)}
              />
          </Row>
          <Row>
            <Input
              type="textarea"
              label="Description"
              value={dataset.description}
              onChange={event => this.handleInputChange('description', event)}
              style={{minHeight: 100}}
              />
          </Row>
        </Col>
        <Col md={6}>
          <label>Attachments</label>
          <ListGroup>
            {dataset.files.map((file, key) => {
              return (
                <ListGroupItem key={key}>
                  <a onClick={() => this.download(file)} style={{cursor: 'pointer'}}>{file.name}</a>
                  <div className="pull-right">
                    <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.removeFile(file)}>
                      <i className="fa fa-trash-o"></i>
                    </Button>
                  </div>
                </ListGroupItem>
              )
            })}
          </ListGroup>
          <Dropzone onDrop={files => this.onDrop(files)} style={{height: 50, width: '100%', border: '3px dashed lightgray'}}>
            <div style={{textAlign: 'center', paddingTop: 12, color: 'gray'}}>
              Drop Files, or Click to Select.
            </div>
          </Dropzone>
        </Col>
      </div>
    );
  }
}
