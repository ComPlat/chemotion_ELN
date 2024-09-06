/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
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
  const [newContent] = useState(fileContent);
  const config = UIStore.getState().moleculeViewer;
  if (!config?.featureEnabled || !fileContent) return <span />;

  if (show) {
    const viewer = (
      <MolViewer
        molContent={newContent}
        viewType={viewType}
        fnInit={() => LoadingActions.start()}
        fnCb={() => LoadingActions.stop()}
        src="/api/v1/converter/structure"
      />
    );
    return (
      <Modal
        animation
        dialogClassName="structure-viewer-modal"
        show={show}
        onHide={handleModalOpen}
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '12pt' }}>
            {MolViewerSet.INFO}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>
            {viewer}
          </div>
        </Modal.Body>
      </Modal>
    );
  }
  return <span />;
}

MolViewerModal.propTypes = {
  fileContent: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    .isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  viewType: PropTypes.string.isRequired,
};

export default MolViewerModal;
