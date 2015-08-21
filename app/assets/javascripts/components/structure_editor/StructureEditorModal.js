import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import Aviator from 'aviator';

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);
  }

  hideModal() {
    let [url, query] = Aviator.getCurrentURI().split('?')
    Aviator.navigate(url+'/hide?'+query);
  }

  render() {
    return (
      <div>
        <Modal dialogClassName="structure-editor" animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>StructureEditorModal</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              Editor goes here ..
            </div>
            <Button bsStyle="warning" onClick={this.hideModal.bind(this)}>Close</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}

