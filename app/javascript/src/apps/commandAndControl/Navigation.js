import React from 'react';
import { Navbar } from 'react-bootstrap';

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

  render() {
    const { currentUser } = this.state;

    return (
      <Navbar className="navbar-custom justify-content-between gap-4 px-4">
        <Navbar.Text>
          <i
            className="fa fa-list"
            onClick={this.toggleDeviceList}
            role="button"
          />
        </Navbar.Text>
        <NavHead />
        <div className="ms-auto">
          {
            currentUser
              ? <UserAuth />
              : <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
          }
        </div>
      </Navbar>
    );
  }
}
