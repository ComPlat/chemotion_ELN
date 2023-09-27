import React from 'react';
import { Nav, Navbar, MenuItem, NavDropdown } from 'react-bootstrap';

import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

import NavNewSession from 'src/components/navigation/NavNewSession';
import DocumentHelper from 'src/utilities/DocumentHelper';
import NavHead from 'src/components/navigation/NavHead';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
    };
    this.onChange = this.onChange.bind(this);
    this.toggleDeviceList = this.toggleDeviceList.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) { this.setState({ currentUser: state.currentUser }); }
  }

  toggleDeviceList() {
    this.props.toggleDeviceList();
  }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{ cursor: "pointer" }}>
          <i
            className="fa fa-list"
            style={{ fontStyle: "normal" }}
            onClick={this.toggleDeviceList}
          />
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    );
  }

  render() {
    const { modalProps } = this.state;

    return this.state.currentUser ? (
      <Navbar fluid className="navbar-custom">
        {this.navHeader()}
        <Nav navbar className="navbar-form">
        </Nav>
        <UserAuth />
        <div style={{ clear: 'both' }} />
      </Navbar>
    ) : (
      <Navbar fluid className="navbar-custom" >
        {this.navHeader()}
        <Nav navbar className="navbar-form" />
        <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
        <div style={{ clear: 'both' }} />
      </Navbar>
    );
  }
}
