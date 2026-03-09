/* eslint-disable react/prop-types */
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Button,
  Form,
  OverlayTrigger,
  Tooltip,
  Row,
  Col, Modal
} from 'react-bootstrap';

function omniauthLabel(icon, name) {
  if (icon) {
    return (
      <img src={`/images/providers/${icon}`} alt={name} title={name} />
    );
  }
  return name;
}

const handleLoginSubmit = async ({ form, url }) => {
  const formData = new FormData();
  formData.append('user[login]', form.login);
  formData.append('user[password]', form.password);
  formData.append('user[remember_me]', form.remember_me);
  formData.append('user[otp_attempt]', form.otp_attempt);

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin'
  });
  const { status } = res;
  if (res.redirected) {
    window.location = res.url;
  }
  let html;
  let content;
  if (status === 401) {
    content = await res.json();
  } else {
    html = await res.text();
  }

  return {
    status,
    content,
    html
  };
};

function OtpInput({
  closeOtp, showOtp, onChange, otp, handleSubmit
}) {
  const handleSubmitWrapper = useCallback(async (e) => {
    e.preventDefault();
    handleSubmit();
  }, [handleSubmit]);
  return (
    <Modal show={showOtp} onHide={closeOtp} centered>
      <Modal.Header closeButton>
        <Modal.Title>Enter One-Time Password</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmitWrapper}>

        <Modal.Body>
          <Form.Group>
            <Form.Label>OTP Code</Form.Label>
            <Form.Control
              type="text"
              name="otp_attempt"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={onChange}
              maxLength={6}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={closeOtp}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={otp.length === 0}>
            Verify
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ExtendedSignInForm({ url, rememberable }) {
  const [form, setForm] = useState({
    login: '',
    password: '',
    remember_me: false,
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const closeOtp = useCallback(() => setShowOtp(false), []);
  const handleChange = (e) => {
    const {
      name, value, type, checked
    } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Assume `htmlString` is the HTML response as a string
  function replaceWarningsInLogin(htmlString) {
    // Parse the HTML string into a DOM Document
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Find the <div id="Home-Login"> in the response
    const { body } = doc;
    const oldAlerts = document.getElementsByClassName('alert');
    while (oldAlerts[0]) {
      oldAlerts[0].parentNode.removeChild(oldAlerts[0]);
    }

    const alerts = body.getElementsByClassName('alert');
    const container = document.body.getElementsByClassName('container')[0];
    Array.from(alerts).forEach((el) => {
      container.prepend(el);
      // Do something with each alert element
    });
  }

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const resText = await handleLoginSubmit({ form, url });
    if (resText.html) {
      setShowOtp(false);
      replaceWarningsInLogin(resText.html);
    } else if (resText.content.otp_required) {
      setShowOtp(true);
    }
  }, [form]);

  return (
    <>
      <h3 className="mb-3">Log in with registered account</h3>
      <OtpInput
        otp={form.otp_attempt}
        onChange={handleChange}
        closeOtp={closeOtp}
        showOtp={showOtp}
        handleSubmit={handleSubmit}
      />

      <Form className="mb-3" onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>
            Email or name abbreviation (case-sensitive)
          </Form.Label>
          <Form.Control
            type="text"
            name="login"
            autoFocus
            value={form.login}
            onChange={handleChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            autoComplete="off"
            value={form.password}
            onChange={handleChange}
          />
        </Form.Group>

        {rememberable && (
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="remember_me"
              label="Remember me"
              checked={form.remember_me}
              onChange={handleChange}
            />
          </Form.Group>
        )}

        <Button variant="primary" type="submit">
          Log in
        </Button>
      </Form>
    </>
  );
}

function SignInForm({ authenticityToken }) {
  const [form, setForm] = useState({
    login: '',
    password: '',
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const closeOtp = useCallback(() => setShowOtp(false), []);
  const handleChange = (e) => {
    const {
      name, value, type, checked
    } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const url = '/users/sign_in';
    const resText = await handleLoginSubmit({ form, url });

    if (resText.content?.otp_required) {
      setShowOtp(true);
    } else if (resText.html) {
      setShowOtp(false);
      window.location = url;
    }
  }, [form]);

  return (
    <Form id="new_user" className="new_user" action="" acceptCharset="UTF-8" method="post" onSubmit={handleSubmit}>
      <OtpInput
        otp={form.otp_attempt}
        onChange={handleChange}
        closeOtp={closeOtp}
        showOtp={showOtp}
        handleSubmit={handleSubmit}
      />
      <input name="utf8" value="✓" type="hidden" />
      <input name="authenticity_token" value={authenticityToken} type="hidden" />

      <Row className="g-1 align-items-center">
        <Col xs="auto">
          <OverlayTrigger
            placement="left"
            overlay={(
              <Tooltip id="login_tooltip">
                Log in with email or name abbreviation (case-senstive)
              </Tooltip>
            )}
          >
            <Form.Group>
              <Form.Control
                id="user_login"
                type="text"
                placeholder="Email or name abbreviation"
                name="login"
                value={form.login}
                onChange={handleChange}
                className=" mr-sm-2"
              />
            </Form.Group>
          </OverlayTrigger>
        </Col>
        <Col xs="auto">
          <Form.Group>
            <Form.Control
              id="user_password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="password"
              className=" mr-sm-2"
            />
          </Form.Group>
        </Col>
        <Col xs="auto">
          <Button type="submit" size="sm" variant="primary">
            <i className="fa fa-sign-in" />
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

function NewSession({ authenticityToken, omniauthProviders = {}, extraRules = {} }) {
  const items = omniauthProviders && Object.keys(omniauthProviders).map((key) => (
    <Button
      key={uuid.v4()}
      className="omniauth-btn"
      style={{ textAlign: 'left', marginRight: '10px' }}
      href={`/users/auth/${key}`}
    >
      Login with
      {' '}
      {omniauthLabel(omniauthProviders[key].icon, omniauthProviders[key].label || key)}
    </Button>
  ));

  const showSignIn = !extraRules.disable_db_login === true;
  const showSignUp = !extraRules.disable_signup === true;

  return (
    <Row className="g-3 align-items-center">
      {items.length !== 0 && <Col xs="auto">{items}</Col>}
      {showSignIn && (
        <Col xs="auto">
          <SignInForm authenticityToken={authenticityToken} />
        </Col>
      )}
      {showSignUp && (
        <Col xs="auto">
          <a href="/users/sign_up">
            or Sign Up
          </a>
        </Col>
      )}
    </Row>
  );
}

NewSession.propTypes = {
  authenticityToken: PropTypes.string.isRequired,
};

export default NewSession;

export {
  ExtendedSignInForm
};
