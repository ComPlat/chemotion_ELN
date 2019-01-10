import React from 'react';
import PropTypes from 'prop-types';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';
import Select from 'react-select';

import {debounce} from 'lodash';

import SharingShortcuts from '../sharing/SharingShortcuts';

import CollectionActions from '../actions/CollectionActions';
import UserActions from '../actions/UserActions';
import UIStore from '../stores/UIStore';
import UserStore from '../stores/UserStore';
import UsersFetcher from '../fetchers/UsersFetcher';

export default class ManagingModalSharing extends React.Component {

  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let {currentUser} = UserStore.getState();
    this.state = {
      currentUser: currentUser,
      role:'Pick a sharing role',
      permissionLevel: props.permissionLevel,
      sampleDetailLevel: props.sampleDetailLevel,
      reactionDetailLevel: props.reactionDetailLevel,
      wellplateDetailLevel: props.wellplateDetailLevel,
      screenDetailLevel: props.screenDetailLevel,
      selectedUsers: null,
    }

    this.onUserChange = this.onUserChange.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSharing = this.handleSharing.bind(this);
    this.promptTextCreator = this.promptTextCreator.bind(this);

    // this.loadUserByName = debounce(this.loadUserByName.bind(this), 300);
    this.loadUserByName = this.loadUserByName.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser
    })
  }

  isElementSelectionEmpty(element) {
    return !element.checkedAll &&
           element.checkedIds.size == 0 &&
           element.uncheckedIds.size == 0;
  }

  isSelectionEmpty(uiState) {
    let isSampleSelectionEmpty = this.isElementSelectionEmpty(uiState.sample);
    let isReactionSelectionEmpty = this.isElementSelectionEmpty(uiState.reaction);
    let isWellplateSelectionEmpty = this.isElementSelectionEmpty(uiState.wellplate);
    let isScreenSelectionEmpty = this.isElementSelectionEmpty(uiState.screen);

    return isSampleSelectionEmpty && isReactionSelectionEmpty &&
           isWellplateSelectionEmpty && isScreenSelectionEmpty
  }

  filterParamsWholeCollection(uiState) {
    let collectionId = uiState.currentCollection.id;
    let filterParams = {
      sample: {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId
      },
      reaction: {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId
      },
      wellplate: {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId
      },
      screen: {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId
      },
      research_plan: {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId
      },
      currentSearchSelection: uiState.currentSearchSelection
    };
    return filterParams;
  }

  filterParamsFromUIState(uiState) {
    let collectionId = uiState.currentCollection.id;

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
      },
      currentSearchSelection: uiState.currentSearchSelection
    };
    return filterParams;
  }

  handleSharing() {
    const {
      permissionLevel, sampleDetailLevel, reactionDetailLevel,
      wellplateDetailLevel, screenDetailLevel
    } = this.state;

    const params = {
      id: this.props.collectionId,
      collection_attributes: {
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel,
        screen_detail_level: screenDetailLevel
      },
    };

    if (this.props.collAction === "Create") {
      const userIds = this.state.selectedUsers;
      const uiState = UIStore.getState();
      const currentCollection = uiState.currentCollection;
      const filterParams =
        this.isSelectionEmpty(uiState)
          ? this.filterParamsWholeCollection(uiState)
          : this.filterParamsFromUIState(uiState);
      const fullParams = {
        ...params,
        elements_filter: filterParams,
        user_ids: userIds,
        currentCollection
      };
      CollectionActions.createSharedCollections(fullParams);
    }

    if (this.props.collAction === 'Update') { CollectionActions.updateSharedCollection(params); }

    if (this.props.collAction === 'EditSync') { CollectionActions.editSync(params); }

    if (this.props.collAction === 'CreateSync') {
      const userIds = this.state.selectedUsers;
      const fullParams = {
        ...params,
        user_ids: userIds,
      };
      CollectionActions.createSync(fullParams);
    }

    this.props.onHide();
  }

  handleShortcutChange(e) {
    let val = e.target.value
    let permAndDetLevs = {}
    switch(val) {
      case 'user':
        permAndDetLevs = SharingShortcuts.user();
        break;
      case 'partner':
        permAndDetLevs = SharingShortcuts.partner();
        break;
      case 'collaborator':
        permAndDetLevs = SharingShortcuts.collaborator();
        break;
      case 'reviewer':
        permAndDetLevs = SharingShortcuts.reviewer();
        break;
      case 'supervisor':
        permAndDetLevs = SharingShortcuts.supervisor();
        break;
    }
    this.setState({...permAndDetLevs,role:val});
  }

  handlePLChange(e) {
    let val = e.target.value
    this.setState({
      role:'Pick a sharing role',
      permissionLevel: val
    });
  }

  handleDLChange(e,elementType){
    let val = e.target.value
    let state = {}
    state[elementType+'DetailLevel'] = val
    state.role = 'Pick a sharing role'
    this.setState(state)
  }

  handleSelectUser(val) {
    if (val) {
      this.setState({selectedUsers: val})
    }
  }

  loadUserByName(input) {
    let {selectedUsers} = this.state;

    if (!input) {
      return Promise.resolve({ options: [] });
    }

    return UsersFetcher.fetchUsersByName(input)
      .then((res) => {
        let usersEntries = res.users.filter(u => u.id != this.state.currentUser.id)
          .map(u => {
            return {
              value: u.id,
              name: u.name,
              label: u.name + " (" + u.abb + ")"
            }
          });
        return {options: usersEntries};
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  promptTextCreator(label) {
    return ("Share with \"" + label + "\"");
  }

  selectUsers() {
    let style = this.props.selectUsers ? {} : {display: 'none'};
    let {selectedUsers} = this.state;

    return(
      <div style={style}>
        <ControlLabel>Select Users to share with</ControlLabel>
        <Select.AsyncCreatable multi={true} isLoading={true}
          backspaceRemoves={true} value={selectedUsers}
          valueKey="value" labelKey="label" matchProp="name"
          promptTextCreator={this.promptTextCreator}
          loadOptions={this.loadUserByName}
          onChange={this.handleSelectUser}
        />
      </div>
    )
  }

  render() {
    const displayWarning = (this.state.permissionLevel || '') === '5' ? 'inline-block' : 'none';
    return (
      <div>
        <FormGroup controlId="shortcutSelect">
          <ControlLabel>Role</ControlLabel>
          <FormControl componentClass="select"
            placeholder="Pick a sharing role (optional)"
            value={this.state.role || ''}
            onChange={(e) => this.handleShortcutChange(e)}>
            <option value='Pick a sharing role'>Pick a sharing role (optional)</option>
            <option value='user'>User</option>
            <option value='partner'>Partner</option>
            <option value='collaborator'>Collaborator</option>
            <option value='reviewer'>Reviewer</option>
            <option value='supervisor'>Supervisor</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="permissionLevelSelect">
          <ControlLabel>Permission level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handlePLChange(e)}
            value={this.state.permissionLevel || ''}>
            <option value='0'>Read</option>
            <option value='1'>Write</option>
            <option value='2'>Share</option>
            <option value='3'>Delete</option>
            <option value='4'>Import Elements</option>
            <option value='5'>Pass ownership</option>
          </FormControl>
          <div style={{
            color: '#d9534f', fontSize: '12px', paddingLeft: '8px', paddingTop: '4px', display: displayWarning
          }}
          >
            <i className="fa fa-exclamation-circle" aria-hidden="true" />&nbsp;Transfering ownership applies for all sub collections.
          </div>
        </FormGroup>
        <FormGroup controlId="sampleDetailLevelSelect">
          <ControlLabel>Sample detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'sample')}
            value={this.state.sampleDetailLevel || ''}>
            <option value='0'>Molecular mass of the compound, external label</option>
            <option value='1'>Molecule, structure</option>
            <option value='2'>Analysis Result + Description</option>
            <option value='3'>Analysis Datasets</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="reactionDetailLevelSelect">
          <ControlLabel>Reaction detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'reaction')}
            value={this.state.reactionDetailLevel || ''}>
            <option value='0'>Observation, description, calculation</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="wellplateDetailLevelSelect">
          <ControlLabel>Wellplate detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'wellplate')}
            value={this.state.wellplateDetailLevel || ''}>
            <option value='0'>Wells (Positions)</option>
            <option value='1'>Readout</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="screenDetailLevelSelect">
          <ControlLabel>Screen detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'screen')}
            value={this.state.screenDetailLevel || ''}>
            <option value='0'>Name, description, condition, requirements</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        {this.selectUsers()}
        <br/>
        <Button bsStyle="warning" onClick={this.handleSharing}>{this.props.collAction} Shared Collection</Button>
      </div>
    )
  }
}

ManagingModalSharing.propTypes = {
          collectionId: PropTypes.number,
          collAction: PropTypes.string,
          selectUsers: PropTypes.bool,
          permissionLevel: PropTypes.number,
          sampleDetailLevel: PropTypes.number,
          reactionDetailLevel: PropTypes.number,
          wellplateDetailLevel: PropTypes.number,
          screenDetailLevel: PropTypes.number,
          onHide: PropTypes.func.isRequired,
          listSharedCollections: PropTypes.bool
};

ManagingModalSharing.defaultProps = {
          collectionId: null,
          collAction: "Create",
          selectUsers: true,
          permissionLevel: 0,
          sampleDetailLevel: 0,
          reactionDetailLevel: 0,
          wellplateDetailLevel: 0,
          screenDetailLevel: 0,
};
