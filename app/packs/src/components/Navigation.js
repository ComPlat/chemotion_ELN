import React from 'react';
import { Nav, Navbar, Tooltip, OverlayTrigger } from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';
import UserStore from './stores/UserStore';
import UIStore from './stores/UIStore'
import UserActions from './actions/UserActions';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';
import NavNewSession from '../libHome/NavNewSession'
import NavHead from '../libHome/NavHead'
import DocumentHelper from '../components/utils/DocumentHelper';
import NavigationModal from './NavigationModal';
import SearchFilter from './search/SearchFilter.js'

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
      }
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
    if (this.state.genericEls === null) {
      this.setState({
        genericEls: state.genericEls
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

  token(){
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
      isSync: uiState.isSync
    });
  }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{cursor: "pointer"}}>
          <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
            <i  className="fa fa-list" style={{fontStyle: "normal"}}
                onClick={this.toggleCollectionTree} />
          </OverlayTrigger>
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    )
  }

  render() {
    const { modalProps, showAdvancedSearch, genericEls } = this.state;
    const { profile } = UserStore.getState();
    const { customClass } = (profile && profile.data) || {};
    return (this.state.currentUser
      ? <Navbar fluid className='navbar-custom'>
          {this.navHeader()}
          <Nav navbar className='navbar-form'>
            <Search />
            <ManagingActions updateModalProps={this.updateModalProps} customClass={customClass} genericEls={genericEls} />
            <ContextActions updateModalProps={this.updateModalProps} customClass={customClass} />
            <NavigationModal {...modalProps} />
          </Nav>
          <UserAuth/>
          <div style={{clear: "both"}} />
          <SearchFilter searchFunc={this.advancedSearch}
            show={showAdvancedSearch}/>
        </Navbar>
      : <Navbar fluid className='navbar-custom'>
          {this.navHeader()}
          <Nav navbar className='navbar-form'>
            <Search noSubmit={true} />
          </Nav>
          <NavNewSession authenticityToken={this.token()}/>
          <div style={{clear: "both"}} />
        </Navbar>
    )
  }
}
