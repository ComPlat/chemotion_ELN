/* eslint-disable react/prop-types */
import React, { useState, useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import { keys } from 'mobx';
import { StoreContext } from 'src/stores/mobx/RootStore';

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
import { useFormValues, submitAsForm } from 'src/utilities/FormHelper';

function omniauthLabel(icon, name) {
  if (icon) {
    return (
      <img src={`/images/providers/${icon}`} alt={name} title={name} />
    );
  }
  return name;
}

const handleLoginSubmit = async ({ form, url }) => {
  const response = await submitAsForm({
    url, form, prefix: 'user', method: 'POST'
  });

  return {
    status: response.status,
    ...(await response.json())
  };
};

const ExtendedSignInForm = observer(({ url, rememberable, username = '', fromInvalid = false }) => {
  const [form, setForm] = useFormValues({
    login: username || '',
    password: '',
    remember_me: false,
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const [wrongOtp, setWrongOtp] = useState(false);
  const closeOtp = useCallback(() => setShowOtp(false), []);

  const handleSubmit = useCallback(async (e) => {
    const userStore = useContext(StoreContext).user;
    e?.preventDefault();
    setForm('otp_attempt', '');
    const loginResult = await handleLoginSubmit({ form, url });
    if (loginResult.status === 200) {
      userStore.setAuthToken(loginResult.token);
      userStore.setRole(loginResult.role);
    } else if (loginResult.status === 400) {
      // handle bad username/password combination
    } else if (loginResult.status === 401 && loginResult.otp_required === true) {
      setShowOtp(true);
      setWrongOtp(loginResult.otp_wrong);
    }
  }, [form, setForm, url]);

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
});

ExtendedSignInForm.propTypes = {
  url: PropTypes.string.isRequired,
  username: PropTypes.string,
  rememberable: PropTypes.bool.isRequired,
};

ExtendedSignInForm.defaultProps = {
  username: '',
};

function SignInForm() {
  const [form, setForm] = useFormValues({
    login: '',
    password: '',
    otp_attempt: ''
  });
  const [showOtp, setShowOtp] = useState('');
  const [wrongOtp, setWrongOtp] = useState(false);
  const closeOtp = useCallback(() => setShowOtp(false), []);
  const url = '/users/sign_in';

  const handleSubmit = useCallback(async (e) => {
    const userStore = useContext(StoreContext).user;
    e?.preventDefault();
    setForm('otp_attempt', '');
    const loginResult = await handleLoginSubmit({ form, url });
    if (loginResult.status === 200) {
      userStore.setAuthToken(loginResult.token);
      userStore.setRole(loginResult.role);
    } else if (loginResult.status === 400) {
      // handle bad username/password combination
    } else if (loginResult.status === 401 && loginResult.otp_required === true) {
      setShowOtp(true);
      setWrongOtp(loginResult.otp_wrong);
    }
  }, [form, setForm]);

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

function NewSession() {
  const { userStore } = useContext(StoreContext);
  const { omniauthProviders, extraRules } = userStore;

  const items = omniauthProviders && keys(omniauthProviders).map((key) => (
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
          <SignInForm />
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

export default observer(NewSession);

export { ExtendedSignInForm };
