import React from 'react';
import PropTypes from 'prop-types';
import { Navbar } from 'react-bootstrap';

const contentComponents = {
  GenericElements: 'Generic Elements Designer',
  GenericSegments: 'Generic Segments Designer',
  GenericDatasets: 'Generic Datasets Designer',
};

export function FunctionLocation({ name }) {
  const text = contentComponents[name];
  return (
    <span style={{ float: 'right' }}>
      <span>You&apos;re in the </span>
      <span style={{ fontWeight: 'bold' }}>{text}</span>
    </span>
  );
}

FunctionLocation.propTypes = { name: PropTypes.string.isRequired };

const createMenu = (text, type) => {
  let menu = (
    <a href={`/${type.split(/(?=[A-Z])/).join('_').toLowerCase()}_admin`}>
      {contentComponents[type]}
    </a>
  );
  menu = text === type ? <b>{menu}</b> : menu;
  return <Navbar.Text key={type}>{menu}</Navbar.Text>;
};

export function GenericMenu({ userName, text }) {
  return (
    <Navbar staticTop>
      <Navbar.Header>
        <Navbar.Brand>
          <a href="/">Back to MyDB</a>
        </Navbar.Brand>
        <Navbar.Toggle />
      </Navbar.Header>
      <Navbar.Collapse>
        {['GenericElements', 'GenericSegments', 'GenericDatasets'].map((e) => createMenu(text, e))}
        <Navbar.Text pullRight>{`Login as: ${userName}`}</Navbar.Text>
      </Navbar.Collapse>
    </Navbar>
  );
}

GenericMenu.propTypes = { userName: PropTypes.string, text: PropTypes.string.isRequired };
GenericMenu.defaultProps = { userName: 'unknown' };

export function Unauthorized({ userName, text }) {
  return (
    <div style={{ width: '90vw', margin: 'auto' }}>
      <GenericMenu userName={userName} text={text} />
      <hr />
      <div style={{ marginTop: '60px', textAlign: 'center' }}>
        <h3>Unauthorized!</h3>
      </div>
    </div>
  );
}

Unauthorized.propTypes = { userName: PropTypes.string, text: PropTypes.string.isRequired };
Unauthorized.defaultProps = { userName: 'unknown' };
