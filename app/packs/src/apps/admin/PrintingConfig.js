import React from 'react';
import { Row, Col, DropdownButton, MenuItem, Button } from 'react-bootstrap';
import Tree from 'antd/lib/tree';
import Dropzone from 'react-dropzone';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import ConfigNames from '../../../../../public/json/printingConfig/configNames.json';

export default class PrintingConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      selectName: 'defaultConfig',
    };
    this.handleSaveBtn = this.handleSaveBtn.bind(this);
    this.handleSelectName = this.handleSelectName.bind(this);
  }

  handleFileDrop(attach) {
    this.setState({ file: attach[0] });
  }

  handleAttachmentRemove() {
    this.setState({ file: null });
  }

  dropzoneOrfilePreview() {
    const { file } = this.state;
    return file ? (
      <div>
        {file.name}
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
          <i className="fa fa-trash-o" />
        </Button>
      </div>
    ) : (
      <Dropzone
        onDrop={(attach) => this.handleFileDrop(attach)}
        style={{ height: 200, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 12,
          color: 'gray'
        }}
        >
          Drop File, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  handleSelectName(configName) {
    this.setState({
      selectName: configName
    });
  }

  handleSaveBtn() {

  }

  displayConfigInDropdown() {
    const configNames = Object.values(ConfigNames);
    const configDropdown = configNames[0].map((name) => (
      <MenuItem key={name} onClick={() => this.handleSelectName(name)}>{name}</MenuItem>
    ));
    return configDropdown;
  }

  render() {
    return (
      <div style={{ minHeight: '600px' }}>
        <div><h4>Import new configuration :</h4></div>
        <Row style={{ maxWidth: '2000px', maxHeight: '3000px', minHeight: '200px', margin: 'auto', marginBottom: '20px' }}>
          {this.dropzoneOrfilePreview()}
        </Row>
        <div><h4>Select configuration :</h4></div>
        <Row style={{ maxWidth: '2000px', maxHeight: '2000px', margin: 'auto' }}>
          <Col md={6}>
            <DropdownButton position="fixed" title={this.state.selectName} style={{ marginRight: '10px' }} >
              {this.displayConfigInDropdown()}
            </DropdownButton>
            <Button
              bsStyle="primary"
              onClick={() => this.handleSaveBtn()}
            >
              Save
            </Button>
          </Col>
        </Row>
      </div>
    );
  }
}
