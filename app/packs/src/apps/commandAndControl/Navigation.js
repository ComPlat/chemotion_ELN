import React from 'react';
import PropTypes from 'prop-types';
import { Nav, Navbar } from 'react-bootstrap';

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
    const { currentUser } = state;
    const { currentUser: oldCurrentUser } = this.state;
    const newId = currentUser ? currentUser.id : null;
    const oldId = oldCurrentUser ? oldCurrentUser.id : null;
    if (newId !== oldId) { this.setState({ currentUser }); }
  }

  toggleDeviceList() {
    const { toggleDeviceList } = this.props;
    toggleDeviceList();
  }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{ cursor: 'pointer' }}>
          <i
            className="fa fa-list"
            style={{ fontStyle: 'normal' }}
            onClick={this.toggleDeviceList}
            role="button"
            onKeyDown={this.toggleDeviceList}
            tabIndex={0}
            aria-label="Toggle Device List"
          />
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    );
  }

  render() {
    const { currentUser } = this.state;
    return currentUser ? (
      <Navbar fluid className="navbar-custom">
        {this.navHeader()}
        <Nav navbar className="navbar-form" />
        <UserAuth />
        <div style={{ clear: 'both' }} />
      </Navbar>
    ) : (
      <Navbar fluid className="navbar-custom">
        {this.navHeader()}
        <Nav navbar className="navbar-form" />
        <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
        <div style={{ clear: 'both' }} />
      </Navbar>
    );
  }
}

Navigation.propTypes = {
  toggleDeviceList: PropTypes.func.isRequired,
};
