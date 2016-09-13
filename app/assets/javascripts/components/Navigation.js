import React from 'react';
import {Nav, Navbar, NavDropdown, NavItem, MenuItem} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';
import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';

import NavNewSession from '../libHome/NavNewSession'
import DocumentHelper from '../components/utils/DocumentHelper';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null
    }
    this.onChange = this.onChange.bind(this)
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({
      currentUser: state.currentUser
    });
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

  token(){
    return DocumentHelper.getMetaContent("csrf-token")
  }

  render() {
    return (this.state.currentUser
      ? <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              {this.brandDropDown()}
            </Navbar.Brand>
          </Navbar.Header>
          <Nav navbar className='navbar-form'>
            <Search />
            <ManagingActions/>
            <ContextActions/>
          </Nav>
          <UserAuth/>
        </Navbar>
      : <Navbar inverse fluid>
          <Navbar.Header>
            <Navbar.Brand>
              {this.brandDropDown()}
            </Navbar.Brand>
          </Navbar.Header>
          <Nav navbar className='navbar-form'>
            <Search />
          </Nav>
          <NavNewSession authenticityToken={this.token()}/>
        </Navbar>
    )
  }
}
