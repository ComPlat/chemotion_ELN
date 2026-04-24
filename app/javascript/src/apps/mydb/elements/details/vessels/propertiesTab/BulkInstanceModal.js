import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form, Alert } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';

function BulkInstanceModal({
  show,
  onHide,
  onSubmit,
  defaultBaseName,
  onValidate,
}) {
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
    <AppModal
      show={show}
      onHide={onHide}
      title="Bulk Create Instances"
      primaryActionLabel={loading ? 'Creating...' : 'Create'}
      onPrimaryAction={handleSubmit}
      primaryActionDisabled={loading}
    >
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
    </AppModal>
  );
}

export default BulkInstanceModal;

BulkInstanceModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  defaultBaseName: PropTypes.string,
  onValidate: PropTypes.func,
};

BulkInstanceModal.defaultProps = {
  defaultBaseName: '',
  onValidate: undefined,
};
