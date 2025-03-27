import React from 'react';
import {
  Nav, Navbar, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import UserAuth from 'src/components/navigation/UserAuth';
import Search from 'src/components/navigation/search/Search';
import ManagingActions from 'src/components/managingActions/ManagingActions';
import ContextActions from 'src/components/contextActions/ContextActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import NavHead from 'src/components/navigation/NavHead';
import DocumentHelper from 'src/utilities/DocumentHelper';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';

const colMenuTooltip = <Tooltip id="col_menu_tooltip">Toggle sidebar</Tooltip>;

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      omniauthProviders: []
    };
    this.onChange = this.onChange.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchGenericEls();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser
      });
    }
    if (state.omniauthProviders !== this.state.omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders
      });
    }

    if (state.extraRules !== this.state.extraRules) {
      this.setState({
        extraRules: state.extraRules
      });
    }
  }

  toggleCollectionTree() {
    this.props.toggleCollectionTree();
  }

  token() {
    return DocumentHelper.getMetaContent('csrf-token');
  }

  navHeader() {
    return (
      <div className="d-flex gap-4">
        <Navbar.Text>
          <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
            <i
              className="fa fa-list"
              onClick={this.toggleCollectionTree}
              role="button"
            />
          </OverlayTrigger>
        </Navbar.Text>
        <NavHead />
      </div>
    );
  }

  userSession(omniauthProviders, extraRules) {
    const { currentUser } = this.state;
    return (
      currentUser
        ? (
          <div className="d-flex gap-2">
            <OpenCalendarButton />
            <UserAuth />
          </div>
        )
        : (
          <NavNewSession
            authenticityToken={this.token()}
            omniauthProviders={omniauthProviders}
            extraRules={extraRules}
          />
        )
    );
  }

  render() {
    const {
      currentUser, omniauthProviders, extraRules
    } = this.state;
    return (
      <Navbar className="bg-gray-200 justify-content-between px-4">
        {this.navHeader()}
        <Nav navbar className="navbar-form gap-2 mx-auto d-flex flex-nowrap">
          <div className="d-flex align-items-center flex-nowrap">
            <Search noSubmit={!!currentUser} className="w-auto" />
          </div>
          {currentUser && (
            <>
              <ManagingActions />
              <ContextActions />
            </>
          )}
        </Nav>
        {this.userSession(omniauthProviders, extraRules)}
      </Navbar>
    );
  }
}
