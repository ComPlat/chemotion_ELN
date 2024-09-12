import React from 'react';
import { NavDropdown, Navbar, Dropdown } from 'react-bootstrap';

function NavHead() {
  const isOnMydb = window.location.href.match(/\/mydb/);
  return (
    <Navbar.Brand className="fs-5">
      <NavDropdown title="Chemotion">
        <NavDropdown.Item as="a" eventKey="11" href="https://chemotion.net/docs/eln/ui" target="_blank">
          Documentation
          <i className="fa fa-external-link float-end" aria-hidden="true" />
        </NavDropdown.Item>
        <NavDropdown.Item as="a" eventKey="14" href="https://chemotion.net/search" target="_blank">
          Search documentation
          <i className="fa fa-external-link float-end" aria-hidden="true" />
        </NavDropdown.Item>
        <NavDropdown.Item as="a" eventKey="11" href="https://chemotion.net/helpdesk" target="_blank">
          Helpdesk - Contact Us
          <i className="fa fa-external-link float-end" aria-hidden="true" />
        </NavDropdown.Item>
        <NavDropdown.Item as="a" eventKey="14" href="https://github.com/ComPlat/chemotion_ELN/issues" target="_blank">
          Report an issue on Github
          <i className="fa fa-external-link float-end" aria-hidden="true" />
        </NavDropdown.Item>
        <Dropdown.Divider />
        <NavDropdown.Item as="a" eventKey="15" href="https://www.chemotion.net" target="_blank">
          Chemotion.net
          <i className="fa fa-external-link float-end" aria-hidden="true" />
        </NavDropdown.Item>
        <NavDropdown.Item as="a" eventKey="15" href="https://www.chemotion-repository.net" target="_blank">
          Chemotion-Repository.net
          {' '}
          <i className="fa fa-external-link" aria-hidden="true" />
        </NavDropdown.Item>
        <Dropdown.Divider />
        <NavDropdown.Item as="a" eventKey="16" href={isOnMydb ? '/home' : '/mydb'} target="_self">
          {isOnMydb ? 'Home' : 'ELN'}
        </NavDropdown.Item>
        <NavDropdown.Item as="a" eventKey="17" href="/about" target="_self">
          About
        </NavDropdown.Item>
      </NavDropdown>
    </Navbar.Brand>
  );
}

NavHead.propTypes = {};

export default NavHead;
