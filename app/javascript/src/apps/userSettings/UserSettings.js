import React, { useCallback, useState } from 'react';
import {
  Row, Form, Button, Alert, Card, Col
} from 'react-bootstrap';
import { formValueHandler, submitAsForm } from 'src/utilities/FormHelper';
import { OtpInput } from 'src/components/common/OtpInput';
import PropTypes from 'prop-types';

function DeleteSettings() {
  const [showOtpDel, setShowOtpDel] = useState(false);
  const [otpAttempt, setOtpAttempt] = useState('');

  const closeOtpDel = useCallback(() => setShowOtpDel(false), []);
  const [isWrongOtp, setIsWrongOtp] = useState(false);
  const onChangeOptAttempt = useCallback((e) => setOtpAttempt(e.target.value), []);

  const handleDelete = async () => {
    setOtpAttempt('');
    const res = await submitAsForm({
      url: '/users', form: { _method: 'delete', 'user[otp_attempt]': otpAttempt }, method: 'POST'
    }).catch((err) => console.error(err.messages || ['Something went wrong']));
    if (res.redirected) {
      window.location = res.url;
    }
    const { status } = res;
    if (status === 401 || status === 422) {
      const content = await res.json();
      setShowOtpDel(content?.otp_required || false);
      setIsWrongOtp(content?.otp_wrong || false);
    } else {
      setShowOtpDel(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (window.confirm('Are you sure you want to delete your account?')) {
      handleDelete().catch((x) => console.error(x));
    }
  };

  return (
    <Card>
      <Card.Header>Delete Account</Card.Header>
      <Card.Body>
        <OtpInput
          value={otpAttempt}
          onOtpChange={onChangeOptAttempt}
          closeOtpModal={closeOtpDel}
          showOtpModal={showOtpDel}
          handleSubmit={handleDelete}
          isWrongOtp={isWrongOtp}
        />
        <Row className="mb-3">
          <Col xs={3}>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Account
            </Button>
          </Col>
          <Col>
            <p>
              By clicking this, your account will be permanently deleted
            </p>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function AccountSettings({ currentUser }) {
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [isWrongOtp, setIsWrongOtp] = useState(false);
  const closeOtp = useCallback(() => setShowOtp(false), []);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(currentUser.unconfirmed_email);
  const [form, setForm] = formValueHandler({
    email: currentUser.email || '',
    password: '',
    password_confirmation: '',
    current_password: '',
    otp_attempt: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Replace with your API call
    setForm('otp_attempt', '');
    const res = await submitAsForm({
      url: '/users', form, prefix: 'user', method: 'PUT'
    }).catch((err) => setErrors(err.messages || ['Something went wrong']));
    const { status } = res;
    let content;
    if (res.redirected) {
      if (form.email !== currentUser.email) {
        setUnconfirmedEmail(form.email);
      }
      setErrors([]);
      setSuccessMessage('Successfully changed user information');
      setForm('password', '');
      setForm('password_confirmation', '');
      setForm('current_password', '');
    }
    if (status === 401 || status === 422) {
      content = await res.json();
      setErrors([]);
    } else {
      const htmlString = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const alerts = doc.getElementsByClassName('error-item');
      setErrors(Array.from(alerts).map((el) => el.textContent));
    }

    setShowOtp(content?.otp_required || false);
    setIsWrongOtp(content?.otp_wrong || false);
  };

  return (
    <Card>
      <Card.Header>Change account log-in</Card.Header>
      <Card.Body>
        <Row>
          {successMessage && (
          <Alert variant="success">
            <div key={`err-${successMessage}`}>{successMessage}</div>
          </Alert>
          )}
          {errors.length > 0 && (
            <Alert variant="danger">
              {errors.map((err) => (
                <div key={`err-${err}`}>{err}</div>
              ))}
            </Alert>
          )}

          <OtpInput
            value={form.otp_attempt}
            onOtpChange={setForm}
            closeOtpModal={closeOtp}
            showOtpModal={showOtp}
            handleSubmit={handleSubmit}
            isWrongOtp={isWrongOtp}
          />

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>New Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={setForm}
                autoFocus
              />
              <Form.Text>Leave unchanged if you don&#39;t want to change it</Form.Text>
            </Form.Group>

            {unconfirmedEmail && (
              <div className="form-text mb-3">
                Currently waiting confirmation for:
                {' '}
                {unconfirmedEmail}
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={form.password}
                onChange={setForm}
                autoComplete="off"
              />
              <Form.Text>Leave blank if you don&#39;t want to change it</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={setForm}
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={setForm}
                autoComplete="off"
              />
              <Form.Text>We need your current password to confirm your changes</Form.Text>
            </Form.Group>

            <Button type="submit" className="btn-primary">
              Change Email/Password
            </Button>
          </Form>
        </Row>

      </Card.Body>
    </Card>
  );
}
AccountSettings.propTypes = {
  currentUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
    unconfirmed_email: PropTypes.string.isRequired,
  }).isRequired
};

export {
  AccountSettings,
  DeleteSettings
};
