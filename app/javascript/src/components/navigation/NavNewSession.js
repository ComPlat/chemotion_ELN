/* eslint-disable react/prop-types */
import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Button,
  Form,
  OverlayTrigger,
  Tooltip,
  Row,
  Col
} from 'react-bootstrap';

import { OtpInput } from 'src/components/common/OtpInput';
import { formValueHandler, submitAsForm } from 'src/utilities/FormHelper';

function omniauthLabel(icon, name) {
  if (icon) {
    return (
      <img src={`/images/providers/${icon}`} alt={name} title={name} />
    );
  }
  return name;
}

const handleLoginSubmit = async ({ form, url }) => {
  const res = await submitAsForm({
    url, form, prefix: 'user', method: 'POST'
  });
  const { status, redirected } = res;
  if (redirected) {
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

function ExtendedSignInForm({
  url, rememberable, username = '', fromInvalid = false
}) {
  const [form, setForm] = formValueHandler({
    login: username || '',
    password: '',
    remember_me: false,
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const [wrongOtp, setWrongOtp] = useState(false);
  const closeOtp = useCallback(() => setShowOtp(false), []);

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

  useEffect(() => {
    if (fromInvalid) {
      replaceWarningsInLogin('<body><div class="alert alert-warning">Invalid Login or password.</div></body>');
    }
  }, [fromInvalid]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setForm('otp_attempt', '');
    const resText = await handleLoginSubmit({ form, url });
    if (resText.html) {
      setShowOtp(false);
      setWrongOtp(false);
      replaceWarningsInLogin(resText.html);
    } else if (resText.content.otp_required) {
      setShowOtp(true);
      setWrongOtp(resText.content.otp_wrong);
    }
  }, [form]);

  return (
    <>
      <h3 className="mb-3">Log in with registered account</h3>
      <OtpInput
        value={form.otp_attempt}
        onOtpChange={setForm}
        closeOtpModal={closeOtp}
        showOtpModal={showOtp}
        handleSubmit={handleSubmit}
        isWrongOtp={wrongOtp}
      />

      <Form className="mb-3" onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label column="lg">
            Email or name abbreviation (case-sensitive)
          </Form.Label>
          <Form.Control
            type="text"
            name="login"
            autoFocus
            value={form.login}
            onChange={setForm}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label column="lg">Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            autoComplete="off"
            value={form.password}
            onChange={setForm}
          />
        </Form.Group>

        {rememberable && (
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="remember_me"
              label="Remember me"
              checked={form.remember_me}
              onChange={setForm}
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

ExtendedSignInForm.propTypes = {
  url: PropTypes.string.isRequired,
  username: PropTypes.string,
  rememberable: PropTypes.bool.isRequired,
  fromInvalid: PropTypes.bool
};

ExtendedSignInForm.defaultProps = {
  username: '',
  fromInvalid: false
};

function SignInForm({ authenticityToken }) {
  const [form, setForm] = formValueHandler({
    login: '',
    password: '',
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const [wrongOtp, setWrongOtp] = useState(false);
  const closeOtp = useCallback(() => setShowOtp(false), []);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setForm('otp_attempt', '');
    const url = '/users/sign_in';
    const resText = await handleLoginSubmit({ form, url });

    if (resText.content?.otp_required) {
      setShowOtp(true);
      console.log(resText.content);
      setWrongOtp(resText.content.otp_wrong);
    } else if (resText.html) {
      setShowOtp(false);
      setWrongOtp(false);
      window.location = `${url}?login=${form.login}&invalid=1`;
    }
  }, [form]);

  return (
    <Form id="new_user" className="new_user" action="" acceptCharset="UTF-8" method="post" onSubmit={handleSubmit}>
      <OtpInput
        value={form.otp_attempt}
        onOtpChange={setForm}
        closeOtpModal={closeOtp}
        showOtpModal={showOtp}
        handleSubmit={handleSubmit}
        isWrongOtp={wrongOtp}
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
                onChange={setForm}
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
              onChange={setForm}
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

SignInForm.propTypes = {
  authenticityToken: PropTypes.string.isRequired,
};

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
  omniauthProviders: PropTypes.PropTypes.objectOf(
    PropTypes.shape({
      icon: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  extraRules: PropTypes.shape({
    disable_db_login: PropTypes.bool.isRequired,
    disable_signup: PropTypes.bool.isRequired,
  }).isRequired
};

NewSession.defaultProps = {
  omniauthProviders: {}
};

export default NewSession;

export {
  ExtendedSignInForm
};
