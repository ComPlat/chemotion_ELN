import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import CollectionActions from '../actions/CollectionActions';
import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';

export default class ShareSettingsModal extends React.Component {
  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let {currentUser, users} = UserStore.getState();
    this.state = {
      node: props.node,
      currentUser: currentUser,
      users: users
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
    React.unmountComponentAtNode(document.getElementById('modal'));
  }

  handleUpdateSharing() {
    let permissionLevel = this.refs.permissionLevelSelect.getValue();
    let sampleDetailLevel = this.refs.sampleDetailLevelSelect.getValue();
    let reactionDetailLevel = this.refs.reactionDetailLevelSelect.getValue();
    let wellplateDetailLevel = this.refs.wellplateDetailLevelSelect.getValue();

    let paramObj = {
      id: this.state.node.id,
      permission_level: permissionLevel,
      sample_detail_level: sampleDetailLevel,
      reaction_detail_level: reactionDetailLevel,
      wellplate_detail_level: wellplateDetailLevel
    }
    CollectionActions.updateSharedCollection(paramObj);
    this.hideModal();
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Update Share Settings for '{this.state.node.label}'</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Input ref='permissionLevelSelect' type='select' label='Permission level' defaultValue={this.state.node.permission_level}>
              <option value='0'>Read</option>
              <option value='1'>Write</option>
              <option value='2'>Share</option>
              <option value='3'>Delete</option>
              <option value='4'>Take ownership</option>
            </Input>
            <Input ref='sampleDetailLevelSelect' type='select' label='Sample detail level' defaultValue={this.state.node.sample_detail_level}>
              <option value='0'>Molecular mass of compound/External label</option>
              <option value='1'>Molecule, structure</option>
              <option value='2'>Analysis Result/Description</option>
              <option value='3'>Analysis Datasets</option>
              <option value='4'>Everything</option>
            </Input>
            <Input ref='reactionDetailLevelSelect' type='select' label='Reaction detail level' defaultValue={this.state.node.reaction_detail_level}>
              <option value='0'>Include Sample Level 1</option>
              <option value='1'>Observation/Description/Calculation</option>
              <option value='2'>Include Sample Level 2</option>
              <option value='3'>Everything</option>
            </Input>
            <Input ref='wellplateDetailLevelSelect' type='select' label='Wellplate detail level' defaultValue={this.state.node.wellplate_detail_level}>
              <option value='0'>Include Samples Level 0/Wells (Positions)</option>
              <option value='1'>Include Sample 1</option>
              <option value='2'>Readout</option>
              <option value='3'>Everything</option>
            </Input>
            <Button bsStyle="warning" onClick={this.handleUpdateSharing.bind(this)}>Update Share</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
