import React, {Component} from 'react';
import {Modal} from 'react-bootstrap';
import ContainerDataset from './ContainerDataset';

export default class ContainerDatasetModal extends Component {
  render() {
    const {show, dataset_container, onHide, onChange,
            readOnly, disabled} = this.props;
    if(show) {
      return (
        <div>
          <Modal animation show={show} bsSize="large" onHide={() => onHide()}>
            <Modal.Header closeButton>
              <Modal.Title>
                {dataset_container.name}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ overflow: 'auto', maxHeight: 'calc(40vh)' }}>
              <ContainerDataset
                readOnly={readOnly}
                dataset_container={dataset_container}
                onModalHide={() => onHide()}
                onChange = {dataset_container => onChange(dataset_container)}
                disabled={disabled}
              />
            </Modal.Body>
          </Modal>
        </div>
      )
    } else {
      return <div></div>
    }
  }
}
