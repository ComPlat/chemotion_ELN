import React from 'react';
import {Nav, Navbar, NavItem} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Navbar brand={<a href="#">Chemotion</a>} inverse fluid>
        <Nav navbar>
          <div className='navbar-form'>
            <Search />
            <ManagingActions/>
            <ContextActions/>
          </div>
        </Nav>
        
          <UserAuth/>

      </Navbar>
    )
  }
}
