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
    this.setState({
      sample: state.sample,
      currentCollection: state.currentCollection
    });
  }

  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  createElementOfType(type) {
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollection.id}/${type}/new`);
  }

  isAllCollection() {
    if(this.state.currentCollection) {
      return this.state.currentCollection.id == 'all';
    } else {
      return false;
    }
  }

  sampleNode() {
    if(this.state.sample.checkedIds.size == 0) {
      return (
        <MenuItem onClick={() => this.createElementOfType('sample')} disabled={this.isAllCollection()}>Create Sample</MenuItem>
      )
    } else {
      return (
        <MenuItem onClick={e => this._splitSelectionAsSubsamples()}>Split as Subsample(s)</MenuItem>
      )
    }
  }

  render() {
    return (
      <ButtonGroup>
        <SplitButton bsStyle="primary" title="Create">
          {this.sampleNode()}
          <MenuItem onClick={() => this.createElementOfType('reaction')} disabled={this.isAllCollection()}>Create Reaction</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('wellplate')} disabled={this.isAllCollection()}>Create Wellplate</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('screen')} disabled={this.isAllCollection()}>Create Screen</MenuItem>
        </SplitButton>
      </ButtonGroup>
    )
  }
}
