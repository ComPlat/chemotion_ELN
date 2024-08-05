import React from 'react';
import PropTypes from 'prop-types';
import { Navbar, Nav, Container } from 'react-bootstrap';

const GenericAdminNav = props => {
  const { userName, text } = props;

  const navLinks = (text, type) => {
    const link = `/${type.split(/(?=[A-Z])/).join('_').toLowerCase()}_admin`;
    const activeClass = text === type ? 'active text-primary fw-bold' : 'text-primary';
    return (
      <Nav.Link href={link} className={activeClass} key={type}>
        {`${type.split(/(?=[A-Z])/).join(' ')} Designer`}
      </Nav.Link>
    );
  }

  return (
    <Navbar fixed="top" expand="lg" className="bg-body-tertiary border-bottom">
      <Container fluid="lg">
        <Navbar.Brand href="/">Back to MyDB</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav" className="justify-content-between">
          <Nav>
            {['GenericElements', 'GenericSegments', 'GenericDatasets'].map(e =>
              navLinks(text, e)
            )}
          </Nav>
          <Navbar.Text>Login as: {userName}</Navbar.Text>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

GenericAdminNav.propTypes = {
  userName: PropTypes.string,
  text: PropTypes.string.isRequired,
};
GenericAdminNav.defaultProps = { userName: '' };

const GenericAdminUnauth = props => (
  <div className="vw-90 mx-auto my-auto">
    <GenericAdminNav {...props} />
    <hr />
    <div className="text-center mt-5 pt-5">
      <h3>Unauthorized!</h3>
    </div>
  </div>
);

GenericAdminUnauth.propTypes = {
  userName: PropTypes.string,
  text: PropTypes.string.isRequired,
};
GenericAdminUnauth.defaultProps = { userName: '' };

export { GenericAdminNav, GenericAdminUnauth };
