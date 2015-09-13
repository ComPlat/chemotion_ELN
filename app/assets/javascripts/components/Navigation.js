import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';
import UserAuth from './UserAuth';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
  }

  handleClick(identifier, e) {
    switch(identifier) {
      case 'collectionManagement':
        Aviator.navigate('/collection/management');
        break;
    }
  }

  render() {
    return (
      <Navbar brand={<a href="#">Chemotion</a>} inverse fluid>
        <Nav>
          <NavItem onClick={this.handleClick.bind(this, 'collectionManagement')}>Collection Management</NavItem>
        </Nav>
        <Nav navbar right>
          <UserAuth/>
        </Nav>
      </Navbar>
    )
  }
}
