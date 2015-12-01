import React from 'react';
import {Button, ButtonToolbar, Input} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import UIStore from '../stores/UIStore';

export default class ManagingModalImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null
    };
  }

  handleClick() {
    const {onHide, action} = this.props;
    const {file} = this.state;
    let ui_state = UIStore.getState();
    let params = {
      file: file,
      currentCollectionId: ui_state.currentCollectionId
    }
    action(params);
    onHide();
  }

  handleFileDrop(attachment_file) {
    console.log(attachment_file);
    this.setState({file: attachment_file[0]});
  }

  handleAttachmentRemove() {
    this.setState({file: null});
  }

  dropzoneOrfilePreview() {
    const {file} = this.state;
    if (file) {
      return (
        <div>
          {file.name}
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()}>
            <i className="fa fa-trash-o"></i>
          </Button>
        </div>
      );
    } else {
      return (
        <Dropzone
          onDrop={attachment_file => this.handleFileDrop(attachment_file)}
          style={{height: 50, width: '100%', border: '3px dashed lightgray'}}
          >
          <div style={{textAlign: 'center', paddingTop: 12, color: 'gray'}}>
            Drop File, or Click to Select.
          </div>
        </Dropzone>
      );
    }
  }

  render() {
    const {onHide} = this.props;
    return (
      <div>
        {this.dropzoneOrfilePreview()}
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
          <Button bsStyle="warning" onClick={() => this.handleClick()}>Import</Button>
        </ButtonToolbar>
      </div>
    )
  }
}
