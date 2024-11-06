import React from 'react';
import {
  Nav, Navbar, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import UserAuth from 'src/components/navigation/UserAuth';
import Search from 'src/components/navigation/search/Search';
import ManagingActions from 'src/components/managingActions/ManagingActions';
import ContextActions from 'src/components/contextActions/ContextActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import NavHead from 'src/components/navigation/NavHead';
import DocumentHelper from 'src/utilities/DocumentHelper';
import NavigationModal from 'src/components/navigation/NavigationModal';
import PropTypes from 'prop-types';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';

const colMenuTooltip = <Tooltip id="col_menu_tooltip">Toggle sidebar</Tooltip>;

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      modalProps: {
        show: false,
        title: '',
        component: null,
        action: null,
        listSharedCollections: false,
      },
      omniauthProviders: []
    };
    this.onChange = this.onChange.bind(this);
    this.onUIChange = this.onUIChange.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
    this.updateModalProps = this.updateModalProps.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange);
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchGenericEls();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange);
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

  onUIChange(state) {
    this.setState({
      modalProps: state.modalParams
    });
  }

  toggleCollectionTree() {
    this.props.toggleCollectionTree();
  }

  token() {
    return DocumentHelper.getMetaContent('csrf-token');
  }

  updateModalProps(modalProps) {
    this.setState({ modalProps });
    UIActions.updateModalProps(modalProps);
  }

  navHeader() {
    const { isHidden } = this.props;

    return (
      <div className="d-flex gap-4">
        {!isHidden && (
          <Navbar.Text>
            <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
              <i
                className="fa fa-list"
                onClick={this.toggleCollectionTree}
                role="button"
              />
            </OverlayTrigger>
          </Navbar.Text>
        )}
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
      currentUser, modalProps, omniauthProviders, extraRules
    } = this.state;
    const { isHidden } = this.props;
    const { profile } = UserStore.getState();
    const { customClass } = (profile && profile.data) || {};
    return (
      <Navbar className="bg-gray-200 justify-content-between px-4">
        {this.navHeader()}
        {!isHidden && (
          <Nav navbar className="navbar-form gap-2 mx-auto d-flex flex-nowrap">
            <div className="d-flex align-items-center flex-nowrap">
              <Search noSubmit={!!currentUser} className="w-auto" />
            </div>
            {currentUser && (
              <>
                <ManagingActions
                  updateModalProps={this.updateModalProps}
                  customClass={customClass}
                />
                <ContextActions
                  updateModalProps={this.updateModalProps}
                  customClass={customClass}
                />
                <NavigationModal {...modalProps} />
              </>
            )}
          </Nav>
        )}
        {this.userSession(omniauthProviders, extraRules)}
      </Navbar>
    );
  }
}

Navigation.propTypes = {
  isHidden: PropTypes.bool,
};

Navigation.defaultProps = {
  isHidden: false,
};
