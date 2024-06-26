import React from 'react';
import { NavDropdown, Navbar } from 'react-bootstrap';
import MenuItem from 'src/components/legacyBootstrap/MenuItem'

function NavHead() {
  const isOnMydb = window.location.href.match(/\/mydb/);
  return (
    <Navbar.Brand>
      <NavDropdown title="Chemotion" className="navig-brand" id="bg-nested-dropdown-brand">
        <NavDropdown.Item eventKey="11" href="https://chemotion.net/docs/eln/ui" target="_blank">
          Documentation
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Item eventKey="14" href="https://chemotion.net/search" target="_blank">
          Search documentation
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Item eventKey="11" href="https://chemotion.net/helpdesk" target="_blank">
          Helpdesk - Contact Us
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Item eventKey="14" href="https://github.com/ComPlat/chemotion_ELN/issues" target="_blank">
          Report an issue on Github
          <i className="fa fa-external-link" style={{ float: 'right' }} aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Divider />
        <NavDropdown.Item eventKey="15" href="https://www.chemotion.net" target="_blank">
          Chemotion.net
          <i className="fa fa-external-link " style={{ float: 'right' }} aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Item eventKey="15" href="https://www.chemotion-repository.net" target="_blank">
          Chemotion-Repository.net
          {' '}
          <i className="fa fa-external-link " aria-hidden />
        </NavDropdown.Item>
        <NavDropdown.Divider />
        <NavDropdown.Item eventKey="16" href={isOnMydb ? '/home' : '/mydb'} target="_self">
          {isOnMydb ? 'Home' : 'ELN'}
        </NavDropdown.Item>
        <NavDropdown.Item eventKey="17" href="/about" target="_self">
          About
        </NavDropdown.Item>
      </NavDropdown>
    </Navbar.Brand>
  );
}

NavHead.propTypes = {
};

export default NavHead;
