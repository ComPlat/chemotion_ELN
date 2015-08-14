import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';
import UserAuth from './UserAuth';

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
        <div className='navbar-right'>
          <UserAuth currentUser={'Bernd Thomas'}/>
        </div>
      </Navbar>
    )
  }
}
