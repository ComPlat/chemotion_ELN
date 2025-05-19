/* eslint-disable react/prop-types */
import React from 'react';
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

function omniauthLabel(icon, name) {
  if (icon) {
    return (
      <img src={`/images/providers/${icon}`} alt={name} title={name} />
    );
  }
  return name;
}

function SignInForm({ authenticityToken }) {
  return (
    <Form id="new_user" className="new_user" action="/users/sign_in" acceptCharset="UTF-8" method="post">
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
                name="user[login]"
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
              name="user[password]"
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

function NewSession({ authenticityToken, omniauthProviders= {}, extraRules = {} }) {
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
