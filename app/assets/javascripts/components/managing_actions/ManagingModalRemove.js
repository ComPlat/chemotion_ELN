import React from 'react';
import UIStore from '../stores/UIStore';
import {Button, ButtonToolbar} from 'react-bootstrap';

export default class ManagingModalRemove extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ui_state: UIStore.getState()
    }
  }

  handleClick() {
    const {onHide, action} = this.props;
    let ui_state = {
      sample: {
        all: this.state.ui_state.sample.checkedAll,
        included_ids: this.state.ui_state.sample.checkedIds,
        excluded_ids: this.state.ui_state.sample.uncheckedIds
      },
      reaction: {
        all: this.state.ui_state.reaction.checkedAll,
        included_ids: this.state.ui_state.reaction.checkedIds,
        excluded_ids: this.state.ui_state.reaction.uncheckedIds
      },
      wellplate: {
        all: this.state.ui_state.wellplate.checkedAll,
        included_ids: this.state.ui_state.wellplate.checkedIds,
        excluded_ids: this.state.ui_state.wellplate.uncheckedIds
      },
      screen: {
        all: this.state.ui_state.screen.checkedAll,
        included_ids: this.state.ui_state.screen.checkedIds,
        excluded_ids: this.state.ui_state.screen.uncheckedIds
      },
      currentCollection: this.state.ui_state.currentCollection,
      currentCollectionId: this.state.ui_state.currentCollection.id
    };
    action({ui_state: ui_state});
    onHide();
  }

  render() {
    const {onHide} = this.props;
    return (
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
        <Button bsStyle="warning" onClick={() => this.handleClick()}>Remove</Button>
      </ButtonToolbar>
    )
  }
}
