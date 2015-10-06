import React from 'react';
import {Button, ButtonGroup} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import ElementActions from './actions/ElementActions';

export default class ContextActions extends React.Component {
  constructor(props) {
    super(props);
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

  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  createElementOfType(type) {
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}/${type}/new`);
  }

  render() {
    const uiState = UIStore.getState();
    const isAllCollection = uiState.currentCollectionId == 'all';
    const sampleNode = (this.state.sample.checkedIds.size == 0) ?
      <Button onClick={() => this.createElementOfType('sample')} disabled={isAllCollection}>Create Sample</Button> :
      <Button onClick={e => this._splitSelectionAsSubsamples()}>Split as Subsample(s)</Button>;

    return (
      <div>
        <ButtonGroup>
          {sampleNode}
          <Button disabled={isAllCollection}>Create Reaction</Button>
          <Button onClick={() => this.createElementOfType('wellplate')} disabled={isAllCollection}>Create Wellplate</Button>
          <Button onClick={() => this.createElementOfType('screen')} disabled={isAllCollection}>Create Screen</Button>
        </ButtonGroup>
      </div>
    )
  }
}
