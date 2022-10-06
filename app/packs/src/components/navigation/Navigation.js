import React from 'react';
import { Nav, Navbar, Tooltip, OverlayTrigger } from 'react-bootstrap';
import UserAuth from 'src/components/navigation/UserAuth';
import Search from 'src/components/navigation/search/Search';
import ManagingActions from 'src/components/managingActions/ManagingActions';
import ContextActions from 'src/components/contextActions/ContextActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore'
import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import NavNewSession from 'src/components/navigation/NavNewSession'
import NavHead from 'src/components/navigation/NavHead'
import DocumentHelper from 'src/utilities/DocumentHelper';
import NavigationModal from 'src/components/navigation/NavigationModal';
import SearchFilter from 'src/components/navigation/search/SearchFilter.js'
import PropTypes from 'prop-types';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';

const colMenuTooltip = <Tooltip id="col_menu_tooltip">Toggle sidebar</Tooltip>;

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      genericEls: null,
      showAdvancedSearch: false,
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null,
        listSharedCollections: false,
      },
      omniauthProviders: []
    }
    this.onChange = this.onChange.bind(this);
    this.onUIChange = this.onUIChange.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
    this.updateModalProps = this.updateModalProps.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange)
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchGenericEls();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange)
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    let newId = state.currentUser ? state.currentUser.id : null
    let oldId = this.state.currentUser ? this.state.currentUser.id : null
    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser
      });
    }
    if (this.state.genericEls === null) {
      this.setState({
        genericEls: state.genericEls
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
      modalProps: state.modalParams,
      showAdvancedSearch: state.showAdvancedSearch
    });
  }

  toggleCollectionTree() {
    this.props.toggleCollectionTree();
  }

  token() {
    return DocumentHelper.getMetaContent("csrf-token")
  }

  updateModalProps(modalProps) {
    this.setState({
      modalProps: modalProps
    });
  }

  advancedSearch(filters) {
    const uiState = UIStore.getState();
    const selection = {
      elementType: 'all',
      advanced_params: filters,
      search_by_method: 'advanced',
      page_size: uiState.number_of_results
    };
    UIActions.setSearchSelection(selection);
    ElementActions.fetchBasedOnSearchSelectionAndCollection({
      selection,
      collectionId: uiState.currentCollection.id,
      isShared: uiState.isShared
    });
  }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{ cursor: "pointer" }}>
          <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
            <i
              className="fa fa-list"
              style={{ fontStyle: "normal", visibility: this.props.isHidden ? 'hidden' : 'visible' }}
              onClick={this.toggleCollectionTree}
            />
          </OverlayTrigger>
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    )
  }

  render() {
    const { modalProps, showAdvancedSearch, genericEls, omniauthProviders, extraRules } = this.state;
    const { profile } = UserStore.getState();
    const { customClass } = (profile && profile.data) || {};
    return (this.state.currentUser
      ? <Navbar fluid className='navbar-custom'>
        {this.navHeader()}
        <Nav navbar className='navbar-form' style={{ visibility: this.props.isHidden ? 'hidden' : 'visible' }}>
          <Search />
          <ManagingActions updateModalProps={this.updateModalProps} customClass={customClass} genericEls={genericEls} />
          <ContextActions updateModalProps={this.updateModalProps} customClass={customClass} />
          <NavigationModal {...modalProps} />
        </Nav>
        <UserAuth />
        <OpenCalendarButton />
        <div style={{ clear: "both" }} />
        <SearchFilter searchFunc={this.advancedSearch}
          show={showAdvancedSearch} />
      </Navbar>
      : <Navbar fluid className='navbar-custom'>
        {this.navHeader()}
        <Nav navbar className='navbar-form' style={{ visibility: this.props.isHidden ? 'hidden' : 'visible' }}>
          <Search noSubmit={true} />
        </Nav>
        <NavNewSession authenticityToken={this.token()} omniauthProviders={omniauthProviders} extraRules={extraRules} />
        <div style={{ clear: "both" }} />
      </Navbar>
    )
  }
}

Navigation.propTypes = {
  isHidden: PropTypes.bool,
};

Navigation.defaultProps = {
  isHidden: false,
};
