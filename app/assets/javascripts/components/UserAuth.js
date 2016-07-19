import React, {Component} from 'react';
import 'whatwg-fetch';

import UserActions from './actions/UserActions';
import UserStore from './stores/UserStore';
import Functions from './utils/Functions';
import {Nav, Navbar, NavDropdown, NavItem, MenuItem, Glyphicon} from 'react-bootstrap';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentUser || {name: 'unknown'}
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

  logout(){
    $.ajax({
      method: "DELETE",
      url: "/users/sign_out.json",
      data: {
        authenticity_token: Functions.getMetaContent("csrf-token")
      }
    }).done(function(){
      location.reload();
    });
    UserActions.logout();
  }

  render() {
    const style = {
      marginRight: '5px'
    };
    return (
      <Nav navbar pullRight>
        <NavDropdown title={`Log in as ${this.state.currentUser.name}`} id="bg-nested-dropdown">
          <MenuItem eventKey="1" href="pages/settings" >Account settings</MenuItem>
          <MenuItem eventKey="2" href="users/edit" >Change Password</MenuItem>
          <MenuItem eventKey="3" href="pages/profiles" >Change profiles</MenuItem>
        </NavDropdown>
        <NavItem onClick={() => this.logout()} style={style} className='' title='Log out'> <Glyphicon glyph="log-out" /> </NavItem>
      </Nav>

    );
  }
}
