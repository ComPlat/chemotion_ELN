import React from 'react';
import {Button, ButtonGroup, SplitButton, MenuItem} from 'react-bootstrap';

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
      <MenuItem onClick={() => this.createElementOfType('sample')} disabled={isAllCollection}>Create Sample</MenuItem> :
      <MenuItem onClick={e => this._splitSelectionAsSubsamples()}>Split as Subsample(s)</MenuItem>;

    return (
      <ButtonGroup>
        <SplitButton bsStyle="primary" title="Create">
          {sampleNode}
          <MenuItem onClick={() => this.createElementOfType('reaction')} disabled={isAllCollection}>Create Reaction</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('wellplate')} disabled={isAllCollection}>Create Wellplate</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('screen')} disabled={isAllCollection}>Create Screen</MenuItem>
        </SplitButton>
      </ButtonGroup>
    )
  }
}
