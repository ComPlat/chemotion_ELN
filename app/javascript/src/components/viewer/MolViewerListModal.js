/* eslint-disable react/forbid-prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Accordion, Col, Modal, Nav, Row } from 'react-bootstrap';
import { MolViewer } from 'react-molviewer';
import UIStore from 'src/stores/alt/stores/UIStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import MolViewerSet from 'src/components/viewer/MolViewerSet';

function MolViewerListModal(props) {
  const config = UIStore.getState().moleculeViewer;
  if (!config?.featureEnabled) return <span />;

  const {
    datasetContainer, handleModalOpen, isPublic, show
  } = props;
  const [molContent, setMolContent] = useState(null);
  const [selected, setSelected] = useState(() => {
    const ds = datasetContainer[0];
    const file = (ds?.attachments?.length > 0 && ds?.attachments[0]) || {};
    return { ...file, dsName: ds.name };
  });

  useEffect(() => {
    if (selected?.id) {
      const url = isPublic
        ? `${window.location.origin}/api/v1/public/download/attachment?id=${selected?.id}`
        : `${window.location.origin}/api/v1/attachments/${selected?.id}`;
      setMolContent(url);
    }
  }, [selected?.id, isPublic]);

  const handleFile = (e, attachment, ds) => {
    e.stopPropagation();
    setSelected({ ...attachment, dsName: ds.name });
  };

  const defaultActiveKey = datasetContainer[0].id;

  const navContainers = datasetContainer.map((ds) => (
    <Accordion.Item
      key={ds.id}
      eventKey={ds.id}
    >
      <Accordion.Header>
        {`Dataset: ${ds.name}`}
      </Accordion.Header>
      <Accordion.Body className="p-0" collapsible>
        <Nav
          variant="pills"
          className="flex-column"
        >
          {ds.attachments.map((attachment) => (
            <Nav.Item key={attachment.id}>
              <Nav.Link
                active={attachment.id === selected?.id}
                onClick={(e) => handleFile(e, attachment, ds)}
              >
                <i className="fa fa-file me-1" aria-hidden="true" />
                {attachment.filename}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </Accordion.Body>
    </Accordion.Item>
  ));

  return (
    <Modal
      centered
      className="modal-xxxl"
      animation
      show={show}
      onHide={handleModalOpen}
    >
      <Modal.Header onClick={(e) => e.stopPropagation()} closeButton>
        <Modal.Title>
          {`Dataset: ${selected.dsName} / File: ${selected?.filename}`}
          {MolViewerSet.INFO}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body onClick={(e) => e.stopPropagation()}>
        <Row>
          <Col sm={2}>
            <Accordion defaultActiveKey={defaultActiveKey}>
              {navContainers}
            </Accordion>
          </Col>
          <Col sm={10}>
            {selected?.id && molContent && (
              <MolViewer
                molContent={molContent}
                viewType={`file_${selected?.id}`}
                fnInit={() => LoadingActions.start()}
                fnCb={() => LoadingActions.stop()}
              />
            )}
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

MolViewerListModal.propTypes = {
  datasetContainer: PropTypes.array.isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  isPublic: PropTypes.bool.isRequired,
  show: PropTypes.bool.isRequired,
};

export default MolViewerListModal;
