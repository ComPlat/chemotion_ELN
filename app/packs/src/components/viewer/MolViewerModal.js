/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { MolViewer } from 'react-molviewer';
import UIStore from 'src/stores/alt/stores/UIStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

const basicCommands = (
  <>
    <div>
      <strong>Zoom In / Out: </strong>Use mouse wheel or Shift + Left-click and
      drag Vertically <strong>Rotate: </strong>Click and hold the left mouse
      button, then drag to rotate
    </div>
    <div>
      <strong>More Functions:</strong> Right-click on the molecule view to open
      the JSmol menu and access more functions, such as saving as PNG file.
    </div>
  </>
);

function MolViewerModal(props) {
  const { fileContent, handleModalOpen, viewType, show } = props;
  const [newContent] = useState(fileContent);
  const config = UIStore.getState().moleculeViewer;
  if (!config?.featureEnabled || !config.chembox) return <span />;

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
            {basicCommands}
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
