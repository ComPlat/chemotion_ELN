/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, Modal, Button } from 'react-bootstrap';
import UnsortedDataset from 'src/apps/mydb/inbox/UnsortedDataset';
import Container from 'src/models/Container';

export default class UnsortedDatasetModal extends React.Component {
  render() {
    const { show, datasetContainer, onHide } = this.props;

    if (!show) { 
      return null;
    }
      return (
        <div>
          <Modal
            centered
            animation
            show={show}
            size="lg"
            onHide={() => onHide()}
          >
            <Modal.Header closeButton>
              <Modal.Title>
                Upload files to Inbox
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <UnsortedDataset
                datasetContainer={datasetContainer}
                onModalHide={() => onHide()}
              />
            </Modal.Body>
          </Modal>
        </div>
      )
  }
}

UnsortedDatasetModal.propTypes = {
  onHide: PropTypes.func.isRequired,
  datasetContainer: PropTypes.instanceOf(Container),
  show: PropTypes.bool.isRequired,
};
UnsortedDatasetModal.defaultProps = {
  datasetContainer: null,
};
