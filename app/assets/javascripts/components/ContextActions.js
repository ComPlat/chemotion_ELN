import React from 'react';
import {Button, ButtonGroup} from 'react-bootstrap';

import UIStore from './stores/UIStore';

class ContextActions extends React.Component {
  constructor(props) {
    super();
    this.state = UIStore.getState();
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState(state);
  }

  availableActions() {
    // TODO später auch für reaktionen usw
    if(this.state.checkedSampleIds.size == 0) {
      return (
        <ButtonGroup vertical>
          <Button>Create Sample</Button>
          <Button>Create Reaction</Button>
          <Button>Create Wellplate</Button>
        </ButtonGroup>
      )
    } else {
      return (
        <ButtonGroup vertical>
          <Button>Split as Subsample(s)</Button>
          <Button>Create Reaction</Button>
          <Button>Create Wellplate</Button>
        </ButtonGroup>
      )
    }
  }

  render() {
    return (
      <div>
        {this.availableActions()}
      </div>
    )
  }
}

module.exports = ContextActions;
