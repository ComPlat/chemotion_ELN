import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';

class Navigation extends React.Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <Navbar brand="Chemotion" inverse>
        <Nav>
          <NavItem>#1</NavItem>
        </Nav>
      </Navbar>
    )
  }
}

module.exports = Navigation;
