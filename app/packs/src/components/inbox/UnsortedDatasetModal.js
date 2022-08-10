import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import UnsortedDataset from 'src/components/inbox/UnsortedDataset';
import Container from 'src/models/Container';

export default class UnsortedDatasetModal extends React.Component {
  render() {
    const { show, datasetContainer, onHide } = this.props;
    if (show) {
      return (
        <div>
          <Modal animation show={show} bsSize="large" onHide={() => onHide()}>
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
    } else {
      return <div></div>
    }
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
