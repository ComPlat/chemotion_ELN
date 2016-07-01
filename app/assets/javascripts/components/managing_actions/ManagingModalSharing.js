import React from 'react';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';
import Select from 'react-select';
import UIStore from '../stores/UIStore';
import CollectionActions from '../actions/CollectionActions';
import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';
import SharingShortcuts from '../sharing/SharingShortcuts';

export default class ManagingModalSharing extends React.Component {
/*  static propTypes = {
        collectionId: React.PropTypes.number,
        collAction: React.PropTypes.string,
        selectUsers: React.PropTypes.boolean,
        permission_level: React.PropTypes.number,
        sample_detail_level: React.PropTypes.number,
        reaction_detail_level: React.PropTypes.number,
        wellplate_detail_level: React.PropTypes.number,
        screen_detail_level: React.PropTypes.number,
        onHide: React.PropTypes.func.isRequired,
  };

  static defaultProps = {
        collectionId: null,
        collAction: "Create",
        selectUsers: true,
        permissionLevel: 0,
        sampleDetailLevel: 0,
        reactionDetailLevel: 0,
        wellplateDetailLevel: 0,
        screenDetailLevel: 0,
  };
*/
  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let {currentUser, users} = UserStore.getState();
    this.state = {
      currentUser: currentUser,
      users: users,
      role:'Pick a sharing role',
      permissionLevel: props.permission_level,
      sampleDetailLevel: props.sample_detail_level,
      reactionDetailLevel: props.reaction_detail_level,
      wellplateDetailLevel: props.wellplate_detail_level,
      screenDetailLevel: props.screen_detail_level,
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

  isElementSelectionEmpty(element) {
    return !element.checkedAll &&
           element.checkedIds.length == 0 &&
           element.uncheckedIds.length == 0;
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
      }
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
      }
    };
    return filterParams;
  }

  handleSharing() {
    let {permissionLevel, sampleDetailLevel, reactionDetailLevel,wellplateDetailLevel,
    screenDetailLevel}= this.state
    let userIds = this.refs.userSelect.state.values.map(o => o.value);
    let uiState = UIStore.getState();
    let currentCollectionId = uiState.currentCollectionId;
    let filterParams =
      this.isSelectionEmpty(uiState) ?
        this.filterParamsWholeCollection(uiState) :
        this.filterParamsFromUIState(uiState);

    let params = {
      id: this.props.collectionId,
      collection_attributes: {
      //  is_shared: true,
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel,
        screen_detail_level: screenDetailLevel
      },
      elements_filter: filterParams,
      user_ids: userIds,
      current_collection_id: currentCollectionId
    }
    if (this.props.collAction == "Create") {CollectionActions.createSharedCollection(params);}
    if (this.props.collAction == "Update") {CollectionActions.updateSharedCollection(params);}
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

  selectUsers() {
    let style = this.props.selectUsers ? {} : {display: 'none'}
    let users = this.state.users.filter((u)=> u.id != this.state.currentUser.id);
    let usersEntries = users.map(
      (user) => {return { value: user.id, label: user.name };});
    return(
      <div style={style}>
        <b>Select Users to share with</b>
        <Select ref='userSelect' name='users' multi={true}
          options={usersEntries}/>
      </div>
    )
  }

  render() {
    return (
      <div>
        <FormGroup controlId="shortcutSelect">
          <ControlLabel>Role</ControlLabel>
          <FormControl componentClass="select"
            placeholder="Pick a sharing role (optional)"
            value={this.state.role}
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
            value={this.state.permissionLevel}>
            <option value='0'>Read</option>
            <option value='1'>Write</option>
            <option value='2'>Share</option>
            <option value='3'>Delete</option>
            <option value='4'>Import Elements</option>
            <option value='5'>Take ownership</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="sampleDetailLevelSelect">
          <ControlLabel>Sample detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'sample')}
            value={this.state.sampleDetailLevel}>
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
            value={this.state.reactionDetailLevel}>
            <option value='0'>Observation, description, calculation</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="wellplateDetailLevelSelect">
          <ControlLabel>Wellplate detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'wellplate')}
            value={this.state.wellplateDetailLevel}>
            <option value='0'>Wells (Positions)</option>
            <option value='1'>Readout</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        <FormGroup controlId="screenDetailLevelSelect">
          <ControlLabel>Screen detail level</ControlLabel>
          <FormControl componentClass="select"
            onChange={(e) => this.handleDLChange(e,'screen')}
            value={this.state.screenDetailLevel}>
            <option value='0'>Name, description, condition, requirements</option>
            <option value='10'>Everything</option>
          </FormControl>
        </FormGroup>
        {this.selectUsers()}
        <br/>
        <Button bsStyle="warning" onClick={()=>this.handleSharing()}>{this.props.collAction} Shared Collection</Button>
      </div>
    )
  }
}

ManagingModalSharing.propTypes = {
          collectionId: React.PropTypes.number,
          collAction: React.PropTypes.string,
          selectUsers: React.PropTypes.boolean,
          permission_level: React.PropTypes.number,
          sample_detail_level: React.PropTypes.number,
          reaction_detail_level: React.PropTypes.number,
          wellplate_detail_level: React.PropTypes.number,
          screen_detail_level: React.PropTypes.number,
          onHide: React.PropTypes.func.isRequired,
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
