import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import ShareButton from './ShareButton';
import MoveButton from './MoveButton';
import AssignButton from './AssignButton';
import RemoveButton from './RemoveButton';
import DeleteButton from './DeleteButton';
import ExportButton from './ExportButton';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import UserActions from './../actions/UserActions';
import PermissionStore from './../stores/PermissionStore';
import PermissionActions from './../actions/PermissionActions';
import ManagingModal from './ManagingModal';
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
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null
      }
    }
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

  isDisabled() {
    const {currentCollection} = this.state;
    if(currentCollection) {
      return currentCollection.id == 'all' || currentCollection.is_shared == true;
    }
  }

  isShareButtonDisabled() {
    return this.state.sharing_allowed == false;
  }

  isDeleteButtonDisabled() {
    return this.state.deletion_allowed == false;
  }

  isRemoteDisabled() {
    if(this.state.currentCollection) {
      let currentCollection = this.state.currentCollection;

      return currentCollection.id == 'all' || (currentCollection.is_shared == true && currentCollection.shared_by_id != this.state.currentUser.id);
    }
  }

  handleModalHide() {
    this.setState({
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null
      }
    });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  handleButtonClick(type) {
    let title, component, action = "";
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
        break;
      case 'delete':
        title = "Delete from all Collections?";
        component = ManagingModalDelete;
        action = ElementActions.deleteElements;
        break;
    }
    this.setState({
      modalProps: {
        show: true,
        title,
        component,
        action
      }
    });
  }

  render() {
    const {modalProps} = this.state;
    return (
      <div style={{display: 'inline', float: 'left', marginRight: 10}}>
        <ButtonGroup>
          <MoveButton isDisabled={this.isDisabled()} onClick={() => this.handleButtonClick('move')}/>
          <AssignButton isDisabled={this.isDisabled()} onClick={() => this.handleButtonClick('assign')}/>
          <RemoveButton isDisabled={this.isRemoteDisabled()} onClick={() => this.handleButtonClick('remove')}/>
          <DeleteButton isDisabled={this.isDeleteButtonDisabled()} onClick={() => this.handleButtonClick('delete')}/>
          <ShareButton isDisabled={this.isShareButtonDisabled()} onClick={() => this.handleButtonClick('share')}/>
          <ExportButton isDisabled={this.isDisabled()}/>
        </ButtonGroup>
        <ManagingModal
          show={modalProps.show}
          title={modalProps.title}
          Component={modalProps.component}
          action={modalProps.action}
          onHide={() => this.handleModalHide()}
          />
      </div>
    )
  }
}
