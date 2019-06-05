import React from 'react';
import { ButtonToolbar, Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import AdminFetcher from '../components/fetchers/AdminFetcher';

export default class OlsTerms extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null
    };
  }

  handleFileDrop(attach) {
    this.setState({ file: attach[0] });
  }

  handleAttachmentRemove() {
    this.setState({ file: null });
  }

  dropzoneOrfilePreview() {
    const { file } = this.state;
    if (file) {
      return (
        <div>
          {file.name}
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o" />
          </Button>
        </div>
      );
    }
    return (
      <Dropzone
        onDrop={attach => this.handleFileDrop(attach)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop File, or Click to Select.
        </div>
      </Dropzone>
    );
  }


  handleClick() {
    const { file } = this.state;
    AdminFetcher.importOlsTerms(file)
      .then((result) => {
        //
      });
  }

  render() {
    return (
      <div>
        {this.dropzoneOrfilePreview()}
        <ButtonToolbar>
          <Button bsStyle="warning" onClick={() => this.handleClick()}>Import OLS Terms (the file name will be the OLS_name)</Button>
        </ButtonToolbar>
      </div>
    );
  }
}
