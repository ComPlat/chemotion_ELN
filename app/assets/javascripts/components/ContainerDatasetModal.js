import React, { Component } from 'react';
import { Modal, ButtonToolbar, Button } from 'react-bootstrap';
import ContainerDataset from './ContainerDataset';

export default class ContainerDatasetModal extends Component {
  constructor(props) {
    super(props);

    this.datasetInput = React.createRef();
    this.handleSave = this.handleSave.bind(this);
  }

  handleSave() {
    this.datasetInput.current.handleSave();
  }

  render() {
    const {
      show, dataset_container, onHide, onChange, readOnly, disabled
    } = this.props;
    if (show) {
      return (
        <Modal show={show} bsSize="large" dialogClassName="attachment-dataset-modal" onHide={() => onHide()}>
          <Modal.Header>
            <Modal.Title>
              {dataset_container.name}
              <ButtonToolbar>
                <Button bsStyle="primary" onClick={() => this.handleSave()} disabled={disabled}>
                  Close
                </Button>
                <Button bsStyle="danger" onClick={() => onHide()}>Discard</Button>
              </ButtonToolbar>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ContainerDataset
              ref={this.datasetInput}
              readOnly={readOnly}
              dataset_container={dataset_container}
              onModalHide={() => onHide()}
              onChange={dataset_container => onChange(dataset_container)}
            />
          </Modal.Body>
        </Modal>
      );
    }
    return <div />;
  }
}
