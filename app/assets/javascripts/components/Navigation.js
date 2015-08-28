import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';
import UserAuth from './UserAuth';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Navbar brand={<a href="#">Chemotion</a>} inverse>
        <Nav>
          <NavItem>#1</NavItem>
        </Nav>
        <Nav navbar right>
          <UserAuth currentUser={'Bernd Thomas'}/>
        </Nav>
      </Navbar>
    )
  }
}
