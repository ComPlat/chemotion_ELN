import React from 'react';
import {Nav, Navbar} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';
import UserStore from './stores/UserStore';
import UIStore from './stores/UIStore'
import UserActions from './actions/UserActions';
import NavNewSession from '../libHome/NavNewSession'
import NavHead from '../libHome/NavHead'
import DocumentHelper from '../components/utils/DocumentHelper';
import NavigationModal from './NavigationModal';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null,
        listSharedCollections: false,
      }
    }
    this.onChange = this.onChange.bind(this)
    this.onUIChange = this.onUIChange.bind(this)
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange)
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange)
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    let newId = state.currentUser ? state.currentUser.id : null
    let oldId =this.state.currentUser ?  this.state.currentUser.id : null
    if (newId !== oldId){
      this.setState({
        currentUser: state.currentUser
      });
    }
  }

  onUIChange(state) {
    this.setState({
      modalProps: state.modalParams
    });
  }

  token(){
    return DocumentHelper.getMetaContent("csrf-token")
  }

  updateModalProps(modalProps) {
    this.setState({
      modalProps: modalProps
    });
  }

  render() {
    const { modalProps } = this.state;

    return (this.state.currentUser
      ? <Navbar fluid className='navbar-custom'>
          <Navbar.Header>
            <NavHead/>
          </Navbar.Header>
          <Nav navbar className='navbar-form'>
            <Search />
            <ManagingActions updateModalProps={this.updateModalProps.bind(this)} />
            <ContextActions updateModalProps={this.updateModalProps.bind(this)} />
            <NavigationModal {...modalProps} />
          </Nav>
          <UserAuth/>
        </Navbar>
      : <Navbar fluid className='navbar-custom'>
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
