import React from 'react';
import {Nav, Navbar} from 'react-bootstrap';
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

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      showAdvancedSearch: false,
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
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this)
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
    let uiState = UIStore.getState()

    let selection = {
      elementType: "all",
      advanced_params: filters,
      search_by_method: "advanced",
      page_size: uiState.number_of_results
    }
    UIActions.setSearchSelection(selection)

    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      uiState.currentCollection.id, 1, uiState.isSync)
  }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{cursor: "pointer"}}>
          <i  className="fa fa-list" style={{fontStyle: "normal"}}
              onClick={this.toggleCollectionTree} />
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    )
  }

  render() {
    const { modalProps, showAdvancedSearch } = this.state;

    return (this.state.currentUser
      ? <Navbar fluid className='navbar-custom'>
          {this.navHeader()}
          <Nav navbar className='navbar-form'>
            <Search />
            <ManagingActions updateModalProps={this.updateModalProps.bind(this)} />
            <ContextActions updateModalProps={this.updateModalProps.bind(this)} />
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
            <Search />
          </Nav>
          <NavNewSession authenticityToken={this.token()}/>
          <div style={{clear: "both"}} />
          <SearchFilter searchFunc={this.advancedSearch}
            show={this.state.showAdvancedSearch}/>
        </Navbar>
    )
  }
}
