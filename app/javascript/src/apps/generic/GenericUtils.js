import React from 'react';
import PropTypes from 'prop-types';
import { Nav, Navbar } from 'react-bootstrap';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';

const contentComponents = {
  GenericElements: 'Generic Elements Designer',
  GenericSegments: 'Generic Segments Designer',
  GenericDatasets: 'Generic Datasets Designer',
};

export const FunctionLocation = ({ name }) => {
  const text = contentComponents[name];
  return (
    <span className="float-end">
      <span>You&apos;re in the </span>
      <span className="fw-bold">{text}</span>
    </span>
  );
};

FunctionLocation.propTypes = { name: PropTypes.string.isRequired };

const createMenu = (text, type) => {
  const href = `/${type.split(/(?=[A-Z])/).join('_').toLowerCase()}_admin`;
  return (
    <Nav.Link
      key={type}
      onClick={() => aviatorNavigationToApp(href)}
      active={text === type}
      className={`custom-nav-link ${text === type ? 'fw-bold' : ''}`}
    >
      {contentComponents[type]}
    </Nav.Link>
  );
};

export const GenericMenu = ({ userName, text }) => (
    <Navbar className="bg-gray-200 px-4">
      <Navbar.Brand href="#" onClick={(e) => { e.preventDefault(); aviatorNavigationToApp('/mydb/collection/all'); }}>
        Back to MyDB
      </Navbar.Brand>
      <Nav>
        {Object.keys(contentComponents).map((e) => createMenu(text, e))}
      </Nav>
      <Navbar.Collapse className="justify-content-end">
        <Navbar.Text>{`Login as: ${userName}`}</Navbar.Text>
      </Navbar.Collapse>
    </Navbar>
  );

GenericMenu.propTypes = { userName: PropTypes.string, text: PropTypes.string.isRequired };
GenericMenu.defaultProps = { userName: 'unknown' };

export const Unauthorized = ({ userName, text }) => (
    <div style={{ width: '90vw', margin: 'auto' }}>
      <GenericMenu userName={userName} text={text} />
      <hr />
      <div style={{ marginTop: '60px', textAlign: 'center' }}>
        <h3>Unauthorized!</h3>
      </div>
    </div>
  );

Unauthorized.propTypes = { userName: PropTypes.string, text: PropTypes.string.isRequired };
Unauthorized.defaultProps = { userName: 'unknown' };
