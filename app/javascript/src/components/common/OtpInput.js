import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Form,
  Alert
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';

function OtpInput({
  closeOtpModal, showOtpModal, onOtpChange, value, handleSubmit, isWrongOtp
}) {
  const handleSubmitWrapper = useCallback(async (e) => {
    e.preventDefault();
    handleSubmit(e);
  }, [handleSubmit]);

  return (
    <AppModal
      show={showOtpModal}
      onHide={closeOtpModal}
      title="Enter One-Time Password"
      closeLabel="Cancel"
      primaryActionLabel="Verify"
      onPrimaryAction={handleSubmit}
      primaryActionDisabled={value.length !== 6}
    >
      <Form onSubmit={handleSubmitWrapper}>
        <Form.Group>
          {isWrongOtp && (
            <Alert variant="danger">Wrong Password! Please try again.</Alert>
          )}
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
        <Button className="d-none" type="submit" tabIndex={-1} aria-hidden="true" />
      </Form>
    </AppModal>
  );
}

OtpInput.propTypes = {
  closeOtpModal: PropTypes.func.isRequired,
  showOtpModal: PropTypes.bool.isRequired,
  onOtpChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  isWrongOtp: PropTypes.bool.isRequired,
};

export default OtpInput;
export {
  OtpInput
};
