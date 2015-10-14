import React, {Component} from 'react';
import {Modal, Col} from 'react-bootstrap';
import Dataset from './Dataset';

export default class DatasetModal extends Component {
  render() {
    const {show, dataset, onHide} = this.props;
    if(show) {
      return (
        <Modal animation show={show} bsSize="large" onHide={() => onHide()}>
          <Modal.Header closeButton>
            <Modal.Title>{dataset.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{minHeight: 500}}>
              <Dataset dataset={dataset} hideModal={() => onHide()}/>
            </div>
          </Modal.Body>
        </Modal>
      )
    } else {
      return <div></div>
    }
  }
}
