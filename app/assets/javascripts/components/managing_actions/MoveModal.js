import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import UIStore from '../stores/UIStore';
import CollectionActions from '../actions/CollectionActions';

import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';

import Aviator from 'aviator';

export default class ShareModal extends React.Component {
  constructor(props) {
    super(props);
  }

  hideModal() {
    Aviator.navigate(Aviator.getCurrentURI()+'/hide');
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Move Selection</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Button bsStyle="warning">Move</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
