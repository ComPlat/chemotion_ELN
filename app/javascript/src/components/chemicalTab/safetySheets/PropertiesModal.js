import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Modal for displaying chemical properties data
 */
function PropertiesModal({
  show,
  onClose,
  title,
  propertiesData
}) {
  return (
    <Modal
      centered
      show={show}
      onHide={onClose}
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId="propertiesModal">
          <Form.Control
            as="textarea"
            className="w-100"
            readOnly
            disabled
            type="text"
            rows={10}
            value={propertiesData}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="warning" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

PropertiesModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  propertiesData: PropTypes.string.isRequired
};

export default PropertiesModal;