import React from 'react';
import { Nav, Navbar, MenuItem, NavDropdown } from 'react-bootstrap';

import UserAuth from '../components/UserAuth';
import UserStore from '../components/stores/UserStore';
import UserActions from '../components/actions/UserActions';

import NavNewSession from '../libHome/NavNewSession';
import DocumentHelper from '../components/utils/DocumentHelper';

const NavHead = () => (
  <Navbar.Brand>
    <NavDropdown title="Chemotion" className="navig-brand" id="bg-nested-dropdown-brand">
      <MenuItem eventKey="11" href="http://www.chemotion.net" target="_blank">Chemotion repository</MenuItem>
      <MenuItem eventKey="13" href="http://www.complat.kit.edu/" target="_blank">Complat</MenuItem>
      <MenuItem eventKey="14" href="https://github.com/ComPlat" target="_blank">Complat on Github</MenuItem>
      <MenuItem divider />
      <MenuItem eventKey="15" href="/" target="_self">ELN</MenuItem>
    </NavDropdown>
  </Navbar.Brand>
);

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
        <Navbar.Text style={{cursor: "pointer"}}>
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
