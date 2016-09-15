import React from 'react';
import {Nav, Navbar} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';
import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';

import NavNewSession from '../libHome/NavNewSession'
import NavHead from '../libHome/NavHead'
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

  token(){
    return DocumentHelper.getMetaContent("csrf-token")
  }

  render() {
    return (this.state.currentUser
      ? <Navbar inverse fluid>
          <Navbar.Header>
            <NavHead/>
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
              <NavHead/>
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
