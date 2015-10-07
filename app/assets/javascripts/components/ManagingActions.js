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
      hidden: true,
      currentUser: currentUser
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

  lookForCheckedElements(uistate) {
    let samples =
      (uistate.sample.checkedIds.size > 0 || uistate.sample.checkedAll)
    let reactions =
      (uistate.reaction.checkedIds.size > 0 || uistate.reaction.checkedAll)
    let screens =
      (uistate.screen.checkedIds.size > 0 || uistate.screen.checkedAll)
    let wellplates =
      (uistate.wellplate.checkedIds.size > 0 || uistate.wellplate.checkedAll)

    return samples || reactions || wellplates || screens
  }

  onChange(state) {
    this.setState({
      hidden: !(this.lookForCheckedElements(state)),
      currentCollection: state.currentCollection
    })
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser
    })
  }

  isDisabled() {
    let currentCollection = this.state.currentCollection;

    return currentCollection.id == 'all' || currentCollection.is_shared == true;
  }

  isRemoteDisabled() {
    let currentCollection = this.state.currentCollection;

    return currentCollection.id == 'all' || (currentCollection.is_shared == true && currentCollection.shared_by_id != this.state.currentUser.id);
  }

  render() {
    if (!this.state.hidden) {
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
    } else {
      return(
        <ButtonGroup/>
      )
    }

  }
}
