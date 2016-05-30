import React from 'react';
import {Nav, Navbar, NavItem, NavDropdown, MenuItem} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
  }

  brandDropDown() {
    return (
      <NavDropdown title='Chemotion' className="navig-brand" id="bg-nested-dropdown-brand">
        <MenuItem eventKey="11" href="http://www.chemotion.net" target="_blank">Chemotion repository</MenuItem>
        <MenuItem eventKey="12" href="http://www.chemotion.net/mf/traffics" target="_blank">Material Finder</MenuItem>
        <MenuItem eventKey="13" href="http://www.complat.kit.edu/" target="_blank">Complat</MenuItem>
        <MenuItem eventKey="14" href="https://github.com/ComPlat" target="_blank">Complat on Github</MenuItem>
      </NavDropdown>
    )
  }

  render() {
    return (
      <Navbar inverse fluid>
        <Navbar.Header>
          <Navbar.Brand>
            {this.brandDropDown()}
          </Navbar.Brand>
        </Navbar.Header>
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
