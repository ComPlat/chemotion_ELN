import React from 'react';
import { NavDropdown, Dropdown } from 'react-bootstrap';

function ExternalLinkItem({ text, href }) {
  return (
    <NavDropdown.Item
      as="a"
      className="d-flex gap-3 align-items-baseline justify-content-between"
      href={href}
      target="_blank"
    >
      {text}
      <i className="fa fa-external-link" />
    </NavDropdown.Item>
  );
}

function NavHead() {
  const isOnMydb = window.location.href.match(/\/mydb/);
  return (
    <NavDropdown title="Chemotion" className="fs-5">
      <ExternalLinkItem text="Chemotion.net" href="https://www.chemotion.net" />
      <ExternalLinkItem text="Search documentation" href="https://chemotion.net/search" />
      <ExternalLinkItem text="Helpdesk - Contact Us" href="https://chemotion.net/helpdesk" />
      <ExternalLinkItem text="Report an issue on Github" href="https://github.com/ComPlat/chemotion_ELN/issues" />
      <Dropdown.Divider />
      <ExternalLinkItem text="Chemotion.net" href="https://www.chemotion.net" />
      <ExternalLinkItem text="Chemotion-Repository.net" href="https://www.chemotion-repository.net" />
      <Dropdown.Divider />

      <NavDropdown.Item as="a" href={isOnMydb ? '/home' : '/mydb'} target="_self">
        {isOnMydb ? 'Home' : 'ELN'}
      </NavDropdown.Item>
      <NavDropdown.Item as="a" href="/about" target="_self">
        About
      </NavDropdown.Item>
    </NavDropdown>
  );
}

export default NavHead;
