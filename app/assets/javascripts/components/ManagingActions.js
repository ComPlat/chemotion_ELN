import React from 'react';
import ShareButton from './managing_actions/ShareButton';
import MoveButton from './managing_actions/MoveButton';
import AssignButton from './managing_actions/AssignButton';
import RemoveButton from './managing_actions/RemoveButton';
import DeleteButton from './managing_actions/DeleteButton';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './stores/UIStore';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hidden: true
    }
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
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
      hidden: !(this.lookForCheckedElements(state))
    })
  }

  render() {
    if (!this.state.hidden) {
      let style = {marginRight: '10px'}
      return (
        <ButtonGroup style={style}>
          <MoveButton />
          <AssignButton />
          <RemoveButton />
          <DeleteButton />
          <ShareButton />
        </ButtonGroup>
      )
    } else {
      return(
        <ButtonGroup/>
      )
    }
    
  }
}
