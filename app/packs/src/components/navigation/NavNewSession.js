/* eslint-disable react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Button,
  Form,
  FormGroup,
  FormControl,
  Navbar,
  NavItem,
  Nav,
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

function NewSession({ authenticityToken, omniauthProviders, extraRules={} }) {
  const signUp = extraRules?.disable_signup === true ? null : (<NavItem href="/users/sign_up"> or Sign Up </NavItem>);
  const items = omniauthProviders && Object.keys(omniauthProviders).map((key) => (
    <Button key={uuid.v4()} className="omniauth-btn" style={{ textAlign: 'left', marginRight: '10px' }} href={`/users/auth/${key}`}>
      Login with &nbsp;
      {omniauthLabel(omniauthProviders[key].icon, omniauthProviders[key].label || key)}
    </Button>
  ));

  const signIn = extraRules && extraRules?.disable_db_login === true ? null : (
    <Form inline id="new_user" className="new_user" action="/users/sign_in" acceptCharset="UTF-8" method="post">
      <input name="utf8" value="✓" type="hidden" />
      <input name="authenticity_token" value={authenticityToken} type="hidden" />
      <Row className='g-0'>
        <Col xs="auto">
          <OverlayTrigger placement="left" overlay={<Tooltip id="login_tooltip">Log in with email or name abbreviation(case-senstive)</Tooltip>}>
            <FormGroup>
              <FormControl id="user_login" type="text" placeholder="Email or name abbreviation" name="user[login]" className=" mr-sm-2"/>
            </FormGroup>
          </OverlayTrigger>
        </Col>
        <Col xs="auto">
          <FormGroup>
            <FormControl id="user_password" type="password" name="user[password]" placeholder="password" className=" mr-sm-2"/>
          </FormGroup>
        </Col>
        <Col xs="auto">
          <Button type="submit" variant="primary">
            <i className="fa fa-sign-in"></i>
          </Button>
        </Col>
      </Row>
    </Form>
  );

  return (
    <Row className='g-3 align-items-center'>
      <Col xs="auto">{items}</Col>
      <Col xs="auto">{signIn}</Col>
      <Col xs="auto">{signUp}</Col>
    </Row>
  );
}

NewSession.propTypes = {
  authenticityToken: PropTypes.string.isRequired,
};

export default NewSession;
