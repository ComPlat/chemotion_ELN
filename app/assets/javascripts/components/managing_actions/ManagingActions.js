import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import ShareButton from './ShareButton';
import MoveOrAssignButton from './MoveOrAssignButton';
import RemoveOrDeleteButton from './RemoveOrDeleteButton';

import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import UserActions from './../actions/UserActions';
import PermissionStore from './../stores/PermissionStore';
import PermissionActions from './../actions/PermissionActions';
import ManagingModalSharing from './ManagingModalSharing';
import ManagingModalCollectionActions from './ManagingModalCollectionActions';
import ManagingModalDelete from './ManagingModalDelete';
import ManagingModalRemove from './ManagingModalRemove';
import ManagingModalTopSecret from './ManagingModalTopSecret';
import ElementActions from '../actions/ElementActions';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    let {currentUser} = UserStore.getState();
    this.state = {
      currentUser: currentUser,
      currentCollection: {id: 0},
      sharing_allowed: false,
      deletion_allowed: false,
      is_top_secret: false,
    }

    this.handleButtonClick = this.handleButtonClick.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onUserChange = this.onUserChange.bind(this)
    this.onPermissionChange = this.onPermissionChange.bind(this)
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    UIStore.listen(this.onChange);
    PermissionStore.listen(this.onPermissionChange);

    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
    UIStore.unlisten(this.onChange);
    PermissionStore.unlisten(this.onPermissionChange);
  }

  onChange(state) {
    if (this.checkUIState(state)){
      let elementsFilter = this.filterParamsFromUIState(state);
      let params = {
        elements_filter: elementsFilter
      }
      PermissionActions.fetchPermissionStatus(params)
      this.setState({
        currentCollection:          state.currentCollection,
        sample_checkedAll:          state.sample.checkedAll,
        sample_checkedIds:          state.sample.checkedIds,
        sample_uncheckedIds:        state.sample.uncheckedIds,
        reaction_checkedAll:        state.reaction.checkedAll,
        reaction_checkedIds:        state.reaction.checkedIds,
        reaction_uncheckedIds:      state.reaction.uncheckedIds,
        wellplate_checkedAll:       state.wellplate.checkedAll,
        wellplate_checkedIds:       state.wellplate.checkedIds,
        wellplate_uncheckedIds:     state.wellplate.uncheckedIds,
        screen_checkedAll:          state.screen.checkedAll,
        screen_checkedIds:          state.screen.checkedIds,
        screen_uncheckedIds:        state.screen.uncheckedIds,
        research_plan_checkedAll:   state.research_plan.checkedAll,
        research_plan_checkedIds:   state.research_plan.checkedIds,
        research_plan_uncheckedIds: state.research_plan.uncheckedIds,

        })
    }
  }

  checkUIState(state){
    return (
      state.currentCollection          !== this.state.currentCollection       ||
      state.sample.checkedAll          != this.state.sample_checkedAll        ||
      state.sample.checkedIds          != this.state.sample_checkedIds        ||
      state.sample.uncheckedIds        != this.state.sample_uncheckedIds      ||
      state.reaction.checkedAll        != this.state.reaction_checkedAll      ||
      state.reaction.checkedIds        != this.state.reaction_checkedIds      ||
      state.reaction.uncheckedIds      != this.state.reaction_uncheckedIds    ||
      state.wellplate.checkedAll       != this.state.wellplate_checkedAll     ||
      state.wellplate.checkedIds       != this.state.wellplate_checkedIds     ||
      state.wellplate.uncheckedIds     != this.state.wellplate_uncheckedIds   ||
      state.screen.checkedAll          != this.state.screen_checkedAll        ||
      state.screen.checkedIds          != this.state.screen_checkedIds        ||
      state.screen.uncheckedIds        != this.state.screen_uncheckedIds      ||
      state.research_plan.checkedAll   != this.state.research_plan_checkedAll ||
      state.research_plan.checkedIds   != this.state.research_plan_checkedIds ||
      state.research_plan.uncheckedIds != this.state.research_plan_uncheckedIds
    )
  }

  hasSelection(){
    const uiState = UIStore.getState();
    let elementsFilter = this.filterParamsFromUIState(uiState);
    let result = false;
    ['sample', 'reaction', 'wellplate', 'screen', 'research_plan'].map(function(prop){
      if(elementsFilter[prop].included_ids.size > 0 || elementsFilter[prop].all)
        result = true;
    });

    return result;
  }

  onUserChange(state) {
    let newId = state.currentUser ? state.currentUser.id : null
    let oldId =this.state.currentUser ?  this.state.currentUser.id : null
    if (newId !== oldId){
      this.setState({
        currentUser: state.currentUser
      });
    }
  }

  onPermissionChange(state) {
    this.setState({
      sharing_allowed: state.sharing_allowed,
      deletion_allowed: state.deletion_allowed,
      is_top_secret: state.is_top_secret
    })
  }

  filterParamsFromUIState(uiState) {
    let collectionId = uiState.currentCollection && uiState.currentCollection.id;

    let filterParams = {
      sample: {
        all: uiState.sample.checkedAll,
        included_ids: uiState.sample.checkedIds,
        excluded_ids: uiState.sample.uncheckedIds,
        collection_id: collectionId
      },
      reaction: {
        all: uiState.reaction.checkedAll,
        included_ids: uiState.reaction.checkedIds,
        excluded_ids: uiState.reaction.uncheckedIds,
        collection_id: collectionId
      },
      wellplate: {
        all: uiState.wellplate.checkedAll,
        included_ids: uiState.wellplate.checkedIds,
        excluded_ids: uiState.wellplate.uncheckedIds,
        collection_id: collectionId
      },
      screen: {
        all: uiState.screen.checkedAll,
        included_ids: uiState.screen.checkedIds,
        excluded_ids: uiState.screen.uncheckedIds,
        collection_id: collectionId
      },
      research_plan: {
        all: uiState.research_plan.checkedAll,
        included_ids: uiState.research_plan.checkedIds,
        excluded_ids: uiState.research_plan.uncheckedIds,
        collection_id: collectionId
      }
    };
    return filterParams;
  }

  isMoveDisabled() {
    const {currentCollection} = this.state;
    if(currentCollection) {
      return currentCollection.label == 'All' || (currentCollection.is_shared == true && currentCollection.permission_level < 4)
    }
  }

  isAssignDisabled(selection) {
    const {currentCollection} = this.state;
    if(currentCollection) {
      return !selection || (currentCollection.is_shared == true && currentCollection.permission_level < 4);
    }
  }

  isShareBtnDisabled(selection) {
    const {currentCollection} = this.state;
    let in_all_collection = (currentCollection) ? currentCollection.label == 'All' : false
    return !selection || in_all_collection || this.state.sharing_allowed == false;
  }

  isDeleteDisabled(selection) {
    return !selection || this.state.deletion_allowed == false;
  }

  isRemoveDisabled(selection) {
    if(this.state.currentCollection) {
      let currentCollection = this.state.currentCollection;

      return !selection || currentCollection.label == 'All' || (currentCollection.is_shared == true && currentCollection.shared_by_id != this.state.currentUser.id);
    }
  }

  handleButtonClick(type) {
    let title, component, action = "";
    let listSharedCollections = false
    switch(type) {
      case 'share':
        if(!this.state.is_top_secret) {
          title = "Sharing";
          component = ManagingModalSharing;
        } else {
          title = "Sharing not allowed";
          component = ManagingModalTopSecret;
        }
        break;
      case 'move':
        title = "Move to Collection";
        component = ManagingModalCollectionActions;
        action = ElementActions.updateElementsCollection;
        break;
      case 'remove':
        title = "Remove selected elements from this Collection?";
        component = ManagingModalRemove;
        action = ElementActions.removeElementsCollection;
        break;
      case 'assign':
        title = "Assign to Collection";
        component = ManagingModalCollectionActions;
        action = ElementActions.assignElementsCollection;
        listSharedCollections = true;
        break;
      case 'delete':
        title = "Delete from all Collections?";
        component = ManagingModalDelete;
        action = ElementActions.deleteElements;
        break;
    }
    const modalProps = {
      show: true,
      title,
      component,
      action,
      listSharedCollections
    };
    this.props.updateModalProps(modalProps);
  }

  render() {
    let sel = this.hasSelection();
    return (
      <div style={{display: 'inline', float: 'left', marginRight: 10}}>
        <ButtonGroup>
          <MoveOrAssignButton assignDisabled={this.isAssignDisabled(sel)}
            moveDisabled={!sel || this.isMoveDisabled()}
            onClick={this.handleButtonClick}/>
          <RemoveOrDeleteButton removeDisabled={this.isRemoveDisabled(sel)}
            deleteDisabled={this.isDeleteDisabled(sel)}
            onClick={this.handleButtonClick}/>
          <ShareButton isDisabled={this.isShareBtnDisabled(sel)}
            onClick={this.handleButtonClick}/>
        </ButtonGroup>
      </div>
    )
  }
}

ManagingActions.propTypes = {
  updateModalProps: React.PropTypes.func.isRequired,
};
