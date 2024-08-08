import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, Modal, Button } from 'react-bootstrap';
import UnsortedDataset from 'src/apps/mydb/inbox/UnsortedDataset';
import Container from 'src/models/Container';

export default class UnsortedDatasetModal extends React.Component {
  render() {
    const { show, datasetContainer, onHide } = this.props;
    return (
      show && (
          <Modal centered animation show={show} size="lg" onHide={() => onHide()}>
            <Modal.Header closeButton>
              <Modal.Title>
                Upload files to Inbox
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="mt-3">
              <UnsortedDataset
                datasetContainer={datasetContainer}
                onModalHide={() => onHide()}
              />
            </Modal.Body>
            <Modal.Footer className="border-0" >
              <ButtonToolbar className="gap-1">
              <Button
                variant="primary"
                onClick={() => onHide()}
              >
                Close
              </Button>
                <Button
                  variant="warning"
                  onClick={() => this.handleSave()}
                >
                  Save
                </Button>
              </ButtonToolbar>
            </Modal.Footer>
          </Modal>
      ));}
}

UnsortedDatasetModal.propTypes = {
  onHide: PropTypes.func.isRequired,
  datasetContainer: PropTypes.instanceOf(Container),
  show: PropTypes.bool.isRequired,
};
UnsortedDatasetModal.defaultProps = {
  datasetContainer: null,
};
