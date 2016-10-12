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
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange.bind(this));
    UIStore.listen(this.onChange.bind(this));
    PermissionStore.listen(this.onPermissionChange.bind(this));

    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange.bind(this));
    UIStore.unlisten(this.onChange.bind(this));
    PermissionStore.unlisten(this.onPermissionChange.bind(this));
  }

  onChange(state) {
    let elementsFilter = this.filterParamsFromUIState(state);

    let params = {
      elements_filter: elementsFilter
    }

    PermissionActions.fetchSharingAllowedStatus(params);
    PermissionActions.fetchDeletionAllowedStatus(params);
    PermissionActions.fetchTopSecretStatus(params);

    this.setState({
      currentCollection: state.currentCollection
    })
  }

  hasSelection(){
    const uiState = UIStore.getState();
    let elementsFilter = this.filterParamsFromUIState(uiState);
    let result = false;
    ['sample', 'reaction', 'wellplate', 'screen'].map(function(prop){
      if(elementsFilter[prop].included_ids.size > 0 || elementsFilter[prop].all)
        result = true;
    });

    return result;
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser
    })
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
