import React from 'react';
import ShareButton from './managing_actions/ShareButton';
import MoveButton from './managing_actions/MoveButton';
import AssignButton from './managing_actions/AssignButton';
import RemoveButton from './managing_actions/RemoveButton';
import DeleteButton from './managing_actions/DeleteButton';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    let {currentUser} = UserStore.getState();

    this.state = {
      currentUser: currentUser,
      currentCollection: {id: 0}
    }
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange.bind(this));
    UIStore.listen(this.onChange.bind(this));

    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange.bind(this));
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      currentCollection: state.currentCollection
    })
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser
    })
  }

  isDisabled() {
    if(this.state.currentCollection) {
      let currentCollection = this.state.currentCollection;

      return currentCollection.id == 'all' || currentCollection.is_shared == true;
    }
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
        <DeleteButton isDisabled={this.isRemoteDisabled()}/>
        <ShareButton/>
      </ButtonGroup>
    )
  }
}
