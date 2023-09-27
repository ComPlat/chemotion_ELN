import React from 'react';
import PropTypes from 'prop-types';
import { Navbar } from 'react-bootstrap';

const navs = (text, type) =>
  text === type ? (
    <Navbar.Text key={type}>
      <b>
        <a
          href={`/${type
            .split(/(?=[A-Z])/)
            .join('_')
            .toLowerCase()}_admin`}
        >{`${type.split(/(?=[A-Z])/).join(' ')} Designer`}</a>
      </b>
    </Navbar.Text>
  ) : (
    <Navbar.Text key={type}>
      <a
        href={`/${type
          .split(/(?=[A-Z])/)
          .join('_')
          .toLowerCase()}_admin`}
      >{`${type.split(/(?=[A-Z])/).join(' ')} Designer`}</a>
    </Navbar.Text>
  );

const GenericAdminNav = props => {
  const { userName, text } = props;
  return (
    <Navbar fixedTop>
      <Navbar.Header>
        <Navbar.Brand>
          <a href="/">Back to MyDB</a>
        </Navbar.Brand>
        <Navbar.Toggle />
      </Navbar.Header>
      <Navbar.Collapse>
        {['GenericElements', 'GenericSegments', 'GenericDatasets'].map(e =>
          navs(text, e)
        )}
        <Navbar.Text pullRight>Login as: {userName}</Navbar.Text>
      </Navbar.Collapse>
    </Navbar>
  );
};

GenericAdminNav.propTypes = {
  userName: PropTypes.string,
  text: PropTypes.string.isRequired,
};
GenericAdminNav.defaultProps = { userName: '' };

const GenericAdminUnauth = props => (
  <div style={{ width: '90vw', margin: 'auto' }}>
    <GenericAdminNav {...props} />
    <hr />
    <div style={{ marginTop: '60px', textAlign: 'center' }}>
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
