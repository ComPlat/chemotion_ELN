import React from 'react';
import ShareButton from './managing_actions/ShareButton';
import MoveButton from './managing_actions/MoveButton';
import AssignButton from './managing_actions/AssignButton';
import RemoveButton from './managing_actions/RemoveButton';
import DeleteButton from './managing_actions/DeleteButton';
import ExportButton from './managing_actions/ExportButton';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';
import PermissionStore from './stores/PermissionStore';
import PermissionActions from './actions/PermissionActions';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    let {currentUser} = UserStore.getState();

    this.state = {
      currentUser: currentUser,
      currentCollection: {id: 0},
      sharing_allowed: false,
      deletion_allowed: false
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
      deletion_allowed: state.deletion_allowed
    })
  }

  filterParamsFromUIState(uiState) {
    let filterParams = {
      sample: {
        all: uiState.sample.checkedAll,
        included_ids: uiState.sample.checkedIds,
        excluded_ids: uiState.sample.uncheckedIds
      },
      reaction: {
        all: uiState.reaction.checkedAll,
        included_ids: uiState.reaction.checkedIds,
        excluded_ids: uiState.reaction.uncheckedIds
      },
      wellplate: {
        all: uiState.wellplate.checkedAll,
        included_ids: uiState.wellplate.checkedIds,
        excluded_ids: uiState.wellplate.uncheckedIds
      },
      screen: {
        all: uiState.screen.checkedAll,
        included_ids: uiState.screen.checkedIds,
        excluded_ids: uiState.screen.uncheckedIds
      }
    };
    return filterParams;
  }

  isDisabled() {
    if(this.state.currentCollection) {
      let currentCollection = this.state.currentCollection;

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

  render() {
    let style = {marginRight: '10px'}
    return (
      <ButtonGroup style={style}>
        <MoveButton isDisabled={this.isDisabled()}/>
        <AssignButton isDisabled={this.isDisabled()}/>
        <RemoveButton isDisabled={this.isRemoteDisabled()}/>
        <DeleteButton isDisabled={this.isDeleteButtonDisabled()}/>
        <ShareButton isDisabled={this.isShareButtonDisabled()}/>
        <ExportButton />
      </ButtonGroup>
    )
  }
}
