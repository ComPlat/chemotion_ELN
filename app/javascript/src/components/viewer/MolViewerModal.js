/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { MolViewer } from 'react-molviewer';
import UIStore from 'src/stores/alt/stores/UIStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import MolViewerSet from 'src/components/viewer/MolViewerSet';

function MolViewerModal(props) {
  const {
    fileContent, handleModalOpen, viewType, show
  } = props;
  const config = UIStore.getState().moleculeViewer;

  if (!config?.featureEnabled || !fileContent) return null;

  const handleHide = () => {
    // Ensure global loading spinner is stopped when the modal is closed,
    // even if the MolViewer unmounts before its callback fires.
    handleModalOpen();
    // Use setTimeout to defer outside any ongoing dispatch cycle
    setTimeout(() => {
      LoadingActions.stop();
    }, 0);
  };

  return (
    <Modal
      animation
      centered
      className="modal-xxxl"
      show={show}
      onHide={handleHide}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {MolViewerSet.INFO}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <MolViewer
          molContent={fileContent}
          viewType={viewType}
          fnInit={() => LoadingActions.start()}
          fnCb={() => LoadingActions.stop()}
          src="/api/v1/converter/structure"
        />
      </Modal.Body>
    </Modal>
  );
}

MolViewerModal.propTypes = {
  fileContent: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    .isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  viewType: PropTypes.string.isRequired,
};

export default MolViewerModal;
