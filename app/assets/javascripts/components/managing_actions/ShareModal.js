import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import UIStore from '../stores/UIStore';
import CollectionActions from '../actions/CollectionActions';

import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';

import Aviator from 'aviator';

export default class ShareModal extends React.Component {
  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let {currentUser, users} = UserStore.getState();
    this.state = {
      currentUser: currentUser,
      users: users,
      permissionLevel: 0,
      sampleDetailLevel: 0,
      reactionDetailLevel: 0,
      wellplateDetailLevel: 0
    }
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange.bind(this));

    UserActions.fetchCurrentUser();
    UserActions.fetchUsers();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange.bind(this));
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser,
      users: state.users
    })
  }

  hideModal() {
    Aviator.navigate(Aviator.getCurrentURI()+'/hide');
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

  handleSharing() {
    let permissionLevel = this.refs.permissionLevelSelect.getValue();
    let sampleDetailLevel = this.refs.sampleDetailLevelSelect.getValue();
    let reactionDetailLevel = this.refs.reactionDetailLevelSelect.getValue();
    let wellplateDetailLevel = this.refs.wellplateDetailLevelSelect.getValue();
    let userIds = this.refs.userSelect.state.values.map(o => o.value);

    let uiState = UIStore.getState();
    let currentCollectionId = uiState.currentCollectionId == "all" ? null : uiState.currentCollectionId;
    let filterParams = this.filterParamsFromUIState(uiState);

    let params = {
      collection_attributes: {
        is_shared: true,
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel
      },
      elements_filter: filterParams,
      user_ids: userIds,
      current_collection_id: currentCollectionId
    }
    CollectionActions.createSharedCollections(params);
    this.hideModal();
  }

  handleShortcutChange() {
    let val = this.refs.shortcutSelect.getValue();

    switch(val) {
      case 'user':
        this.setState({
          permissionLevel: 4,
          sampleDetailLevel: 2,
          reactionDetailLevel: 1,
          wellplateDetailLevel: 3
        });
        break;
      case 'partner':
        this.setState({
          permissionLevel: 1,
          sampleDetailLevel: 4,
          reactionDetailLevel: 3,
          wellplateDetailLevel: 3
        });
        break;
      case 'collaborator':
        this.setState({
          permissionLevel: 0,
          sampleDetailLevel: 1,
          reactionDetailLevel: 1,
          wellplateDetailLevel: 1
        });
        break;
      case 'reviewer':
        this.setState({
          permissionLevel: 0,
          sampleDetailLevel: 2,
          reactionDetailLevel: 3,
          wellplateDetailLevel: 2
        });
        break;
      case 'supervisor':
        this.setState({
          permissionLevel: 4,
          sampleDetailLevel: 4,
          reactionDetailLevel: 3,
          wellplateDetailLevel: 3
        });
        break;
    }
  }

  handlePLChange() {
    let val = this.refs.permissionLevelSelect.getValue();

    this.setState({
      permissionLevel: val
    });
  }

  handleSampleDLChange() {
    let val = this.refs.sampleDetailLevelSelect.getValue();

    this.setState({
      sampleDetailLevel: val
    });
  }

  handleReactionDLChange() {
    let val = this.refs.reactionDetailLevelSelect.getValue();

    this.setState({
      reactionDetailLevel: val
    });
  }

  handleWellplateDLChange() {
    let val = this.refs.wellplateDetailLevelSelect.getValue();

    this.setState({
      wellplateDetailLevel: val
    });
  }

  usersEntries() {
    let users = this.state.users.filter((u)=> u.id != this.state.currentUser.id);
    return users.map(
      (user) => {
        return { value: user.id, label: user.name }
      }
    );
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Sharing</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Input ref='shortcutSelect' type='select' label='Role' onChange={(e) => this.handleShortcutChange(e)}>
              <option value='Pick a sharing role'>Pick a sharing role (optional)</option>
              <option value='user'>User</option>
              <option value='partner'>Partner</option>
              <option value='collaborator'>Collaborator</option>
              <option value='reviewer'>Reviewer</option>
              <option value='supervisor'>Supervisor</option>
            </Input>
            <Input ref='permissionLevelSelect' type='select' label='Permission level' value={this.state.permissionLevel} onChange={(e) => this.handlePLChange(e)}>
              <option value='0'>Read</option>
              <option value='1'>Write</option>
              <option value='2'>Share</option>
              <option value='3'>Delete</option>
              <option value='4'>Take ownership</option>
            </Input>
            <Input ref='sampleDetailLevelSelect' type='select' label='Sample detail level' value={this.state.sampleDetailLevel} onChange={(e) => this.handleSampleDLChange(e)}>
              <option value='0'>Molecular mass of compound/External label</option>
              <option value='1'>Molecule, structure</option>
              <option value='2'>Analysis Result/Description</option>
              <option value='3'>Analysis Datasets</option>
              <option value='4'>Everything</option>
            </Input>
            <Input ref='reactionDetailLevelSelect' type='select' label='Reaction detail level' value={this.state.reactionDetailLevel} onChange={(e) => this.handleReactionDLChange(e)}>
              <option value='0'>Include Sample Level 1</option>
              <option value='1'>Observation/Description/Calculation</option>
              <option value='2'>Include Sample Level 2</option>
              <option value='3'>Everything</option>
            </Input>
            <Input ref='wellplateDetailLevelSelect' type='select' label='Wellplate detail level' value={this.state.wellplateDetailLevel} onChange={(e) => this.handleWellplateDLChange(e)}>
              <option value='0'>Include Samples Level 0/Wells (Positions)</option>
              <option value='1'>Include Sample 1</option>
              <option value='2'>Readout</option>
              <option value='3'>Everything</option>
            </Input>

            <b>Select Users to share with</b>
            <Select ref='userSelect' name='users' multi={true}
                    options={this.usersEntries()} />
            <br/>
            <Button bsStyle="warning" onClick={this.handleSharing.bind(this)}>Share</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
