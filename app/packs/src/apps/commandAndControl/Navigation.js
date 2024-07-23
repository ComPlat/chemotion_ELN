import React from 'react';
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
        <Navbar.Text>
          <i
            className="fa fa-list"
            onClick={this.toggleDeviceList}
            role='button'
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
      <div>
        {this.navHeader()}
        <UserAuth />
        <div style={{ clear: 'both' }} />
      </div>
    ) : (
      <div className="bg-gray-200" >
        {this.navHeader()}
        <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
        <div style={{ clear: 'both' }} />
      </div>
    );
  }
}
