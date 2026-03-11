import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Form,
  Modal
} from 'react-bootstrap';

function OtpInput({
  closeOtpModal, showOtpModal, onOtpChange, value, handleSubmit
}) {
  const handleSubmitWrapper = useCallback(async (e) => {
    e.preventDefault();
    handleSubmit(e);
  }, [handleSubmit]);

  return (
    <Modal show={showOtpModal} onHide={closeOtpModal} centered>
      <Modal.Header closeButton>
        <Modal.Title>Enter One-Time Password</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmitWrapper}>

        <Modal.Body>
          <Form.Group>
            <Form.Label column="lg">OTP Code</Form.Label>
            <Form.Control
              type="text"
              name="otp_attempt"
              placeholder="Enter 6-digit code"
              value={value}
              onChange={onOtpChange}
              maxLength={6}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={closeOtpModal}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={value.length !== 6}>
            Verify
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

OtpInput.propTypes = {
  closeOtpModal: PropTypes.func.isRequired,
  showOtpModal: PropTypes.bool.isRequired,
  onOtpChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

export {
  OtpInput
};
