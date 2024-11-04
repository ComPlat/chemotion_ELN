import React from 'react';
import { Nav, Navbar, Container, Button } from 'react-bootstrap';

import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

import NavNewSession from 'src/components/navigation/NavNewSession';
import DocumentHelper from 'src/utilities/DocumentHelper';
import NavHead from 'src/components/navigation/NavHead';

export default class AdminNavigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
    };
    this.toggleTree = this.toggleTree.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchUnitsSystem();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) { this.setState({ currentUser: state.currentUser }); }
  }

  toggleTree() {
    this.props.toggleTree();
  }


  render() {
    const { currentUser } = this.state;
    return (
      <Navbar bg="grey" expand="lg" className="bg-gray-200 py-4">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <Button
              variant="light"
              className="me-2 p-0 border-0 bg-transparent"
              onClick={this.toggleTree}
              aria-label="Toggle Tree"
            >
              <i className="fa fa-list" size="lg" />
            </Button>
            <NavHead />
          </Navbar.Brand>
          <div className="h1 mb-0 ms-5 ps-5">ELN Administration</div>
          <Nav className="ms-auto fs-5">
            {currentUser
              ? <UserAuth />
              : <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
            }
          </Nav>
        </Container>
      </Navbar>
    );
  }
}
