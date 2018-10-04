import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  FormGroup,
  FormControl,
  Glyphicon,
  Navbar,
  NavItem,
  Nav
} from 'react-bootstrap';

const NewSession = ({ authenticityToken }) => (
  <div>
    <Nav pullRight><NavItem  href='/users/sign_up'> or Sign Up </NavItem></Nav>
    <Navbar.Form pullRight>
      <form id="new_user" className="new_user" action="/users/sign_in" acceptCharset='UTF-8' method="post" >
        <input name="utf8" value="✓" type="hidden"/>
        <input name="authenticity_token" value={authenticityToken} type="hidden"/>
        <FormGroup>
          <FormControl id='user_email' type="email" placeholder="email" name="user[email]" />
        </FormGroup>
        <FormGroup>
          <FormControl id='user_password' type="password" name="user[password]" placeholder="password"/>
        </FormGroup>
        <Button type="submit" bsStyle='primary' >
          <Glyphicon glyph="log-in"  />
        </Button>
      </form>
    </Navbar.Form>
  </div>
);

NewSession.propTypes = {
  authenticityToken: PropTypes.string.isRequired,
}

export default NewSession;
