import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
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
