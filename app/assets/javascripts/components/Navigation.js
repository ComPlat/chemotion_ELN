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

  updateModalProps(modalProps) {
    this.setState({
      modalProps: modalProps
    });
  }

  handleModalHide() {
    const modalProps = {
      show: false,
      title: "",
      component: "",
      action: null
    };
    this.updateModalProps(modalProps);
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  render() {
    const { modalProps } = this.state;

    return (this.state.currentUser
      ? <Navbar inverse fluid>
          <Navbar.Header>
            <NavHead/>
          </Navbar.Header>
          <Nav navbar className='navbar-form'>
            <Search />
            <ManagingActions updateModalProps={this.updateModalProps.bind(this)} />
            <ContextActions updateModalProps={this.updateModalProps.bind(this)} />
            <NavigationModal show={modalProps.show}
                              title={modalProps.title}
                              Component={modalProps.component}
                              action={modalProps.action}
                              onHide={() => this.handleModalHide()}
                              listSharedCollections={modalProps.listSharedCollections} />
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
