import React from 'react';
import { NavDropdown, Navbar, MenuItem } from 'react-bootstrap';

function NavHead() {
  const isOnMydb = window.location.href.match(/\/mydb/);
  return (
    <Navbar.Brand>
      <NavDropdown title="Chemotion" className="navig-brand" id="bg-nested-dropdown-brand">
        <MenuItem eventKey="11" href="https://chemotion.net/docs/eln/ui" target="_blank">
          Documentation
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </MenuItem>
        <MenuItem eventKey="14" href="https://chemotion.net/search" target="_blank">
          Search documentation
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </MenuItem>
        <MenuItem eventKey="11" href="https://chemotion.net/helpdesk" target="_blank">
          Helpdesk - Contact Us
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </MenuItem>
        <MenuItem eventKey="14" href="https://github.com/ComPlat/chemotion_ELN/issues" target="_blank">
          Report an issue on Github
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </MenuItem>
        <MenuItem divider />
        <MenuItem eventKey="15" href="https://www.chemotion.net" target="_blank">
          Chemotion.net
          <i className="fa fa-external-link " style={{ float: 'right' }} aria-hidden />
        </MenuItem>
        <MenuItem eventKey="15" href="https://www.chemotion-repository.net" target="_blank">
          Chemotion-Repository.net
          {' '}
          {' '}
          <i className="fa fa-external-link " aria-hidden />
        </MenuItem>
        <MenuItem divider />
        <MenuItem eventKey="16" href={isOnMydb ? '/home' : '/mydb'} target="_self">
          {isOnMydb ? 'Home' : 'ELN'}
        </MenuItem>
        <MenuItem eventKey="17" href="/about" target="_self">
          About
        </MenuItem>
      </NavDropdown>
    </Navbar.Brand>
  );
}

NavHead.propTypes = {
};

export default NavHead;
