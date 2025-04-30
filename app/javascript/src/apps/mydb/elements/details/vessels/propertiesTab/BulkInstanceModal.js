import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert } from 'react-bootstrap';

function BulkInstanceModal({ show, onHide, onSubmit, defaultBaseName = '', onValidate }) {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [baseName, setBaseName] = useState(defaultBaseName);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (show) {
      setBaseName(defaultBaseName);
      setValidationError('');
    }
  }, [show, defaultBaseName]);

  const handleSubmit = async () => {
    const error = onValidate?.();
    if (error) {
      setValidationError(error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(count, baseName);
      setCount(1);
      setBaseName('');
      setValidationError('');
      onHide();
    } catch (e) {
      setValidationError('Failed to create instances. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Bulk Create Instances</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {validationError && (
          <Alert variant="danger">
            <pre className="m-0">{validationError}</pre>
          </Alert>
        )}
        <Form.Group>
          <Form.Label>Number of Instances</Form.Label>
          <Form.Control
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
          <Form.Text muted>Max allowed: 100</Form.Text>
        </Form.Group>

        <Form.Group className="mt-3">
          <Form.Label>Base Name (optional)</Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g., Sample"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" disabled={loading} onClick={handleSubmit}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default BulkInstanceModal;
