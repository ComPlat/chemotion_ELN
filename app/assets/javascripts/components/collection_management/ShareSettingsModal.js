import React from 'react';
import ReactDOM from 'react-dom';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';


import CollectionActions from '../actions/CollectionActions';
import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';
import SharingShortcuts from '../sharing/SharingShortcuts';

export default class ShareSettingsModal extends React.Component {
  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let {currentUser, users} = UserStore.getState();
    this.state = {
      node: props.node,
      currentUser: currentUser,
      users: users,
      role:'Pick a sharing role',
      permissionLevel: props.permission_level,
      sampleDetailLevel: props.sample_detail_level,
      reactionDetailLevel: props.reaction_detail_level,
      wellplateDetailLevel: props.wellplate_detail_level,
      screenDetailLevel: props.screen_detail_level
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
    ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
  }

  handleUpdateSharing() {

    let {permissionLevel, sampleDetailLevel, reactionDetailLevel,wellplateDetailLevel,
    screenDetailLevel}= this.state
    let params = {
      id: this.state.node.id,
      collection_attributes: {
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel,
        screen_detail_level: screenDetailLevel
      },
    }
    CollectionActions.updateSharedCollection(params);
    this.hideModal();
  }

  handleShortcutChange(e) {
    let val = e.target.value;
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
    let state = {};
    state[elementType+'DetailLevel'] = val;
    state.role = 'Pick a sharing role',
    this.setState(state);
  }

  render() {
    return (
      <div>
          <FormGroup controlId="formControlshortcutSelect">
            <ControlLabel>Role</ControlLabel>
            <FormControl componentClass="select"
              placeholder="Pick a sharing role (optional)"
              value={this.state.role}
              onChange={(e) => this.handleShortcutChange(e)}
            > <option value='Pick a sharing role'>Pick a sharing role (optional)</option>
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
              value={this.state.permissionLevel}
            >
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
              value={this.state.sampleDetailLevel}
            >
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
              value={this.state.reactionDetailLevel}
            >
              <option value='0'>Observation, description, calculation</option>
              <option value='10'>Everything</option>
            </FormControl>
          </FormGroup>
          <FormGroup controlId="wellplateDetailLevelSelect">
            <ControlLabel>Wellplate detail level</ControlLabel>
            <FormControl componentClass="select"
              onChange={(e) => this.handleDLChange(e,'wellplate')}
              value={this.state.wellplateDetailLevel}
            >
              <option value='0'>Wells (Positions)</option>
              <option value='1'>Readout</option>
              <option value='10'>Everything</option>
            </FormControl>
          </FormGroup>
          <FormGroup controlId="screenDetailLevelSelect">
            <ControlLabel>Screen detail level</ControlLabel>
            <FormControl componentClass="select"
              onChange={(e) => this.handleDLChange(e,'screen')}
              value={this.state.screenDetailLevel}
            >
              <option value='0'>Name, description, condition, requirements</option>
              <option value='10'>Everything</option>
            </FormControl>
          </FormGroup>
          <Button bsStyle="warning" onClick={this.handleUpdateSharing.bind(this)}>Update Share</Button>
      </div>
    )
  }
}
