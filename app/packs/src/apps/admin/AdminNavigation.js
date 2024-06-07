import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';

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

  navHeader() {
    return (
      <>
        <Navbar expand="lg" bg="grey">
          <Container>
            {/* className="collec-tree" */}

            <Navbar.Toggle aria-controls="basic-navbar-nav">
              <i
                className="fa fa-list"
                onClick={this.toggleTree}
                role='button'
              />
            </Navbar.Toggle>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Navbar.Brand>
                  <NavHead />
                </Navbar.Brand>

              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </>

    );
  }

  render() {
    return this.state.currentUser ? (
      <Navbar bg="grey" expand="lg" className="navbar-custom">
        <Container>
          {this.navHeader()}

          <Nav className="me-auto">
          <h1>ELN Administration</h1>
          </Nav>
          <Nav className="ms-auto">
            <UserAuth />
          </Nav>
          <div className="clearFix" />
        </Container>
      </Navbar>
    ) : (
        <Navbar bg="grey" expand="lg" className="navbar-custom">
          <Container>
            {this.navHeader()}
            <Nav className="me-auto">
              <h1>ELN Administration</h1>
            </Nav>
            <Nav className="ms-auto">
              <NavNewSession authenticityToken={DocumentHelper.getMetaContent('csrf-token')} />
            </Nav>
            <div className="clearFix" />
          </Container>
      </Navbar>
    );
  }
}
