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
      show, dataset_container, onHide, onChange, readOnly, disabled, kind
    } = this.props;
    if (show) {
      return (
        <Modal show={show} backdrop="static" bsSize="large" dialogClassName="attachment-dataset-modal" onHide={() => this.handleSave()}>
          <Modal.Header>
            <Modal.Title>
              {dataset_container.name}
              <ButtonToolbar>
                <Button bsStyle="light" onClick={() => this.handleSave()} disabled={disabled}>
                  <i className="fa fa-times" />
                </Button>
              </ButtonToolbar>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ContainerDataset
              ref={this.datasetInput}
              readOnly={readOnly}
              dataset_container={dataset_container}
              kind={kind}
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
