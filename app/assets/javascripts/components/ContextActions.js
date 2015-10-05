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

  _createSample() {
    Aviator.navigate(this._createSampleUrl());
  }

  _createSampleUrl() {
    return `${this._collectionUrl()}/sample/new`
  }

  _collectionUrl() {
    let uiState = UIStore.getState();
    return `/collection/${uiState.currentCollectionId}`
  }

  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  createScreen() {
    Aviator.navigate(`${this._collectionUrl()}/screen/new`);
  }

  render() {
    const uiState = UIStore.getState();
    const isAllCollection = uiState.currentCollectionId == 'all';
    const sampleNode = (this.state.sample.checkedIds.size == 0) ?
      <Button onClick={e => this._createSample()} disabled={isAllCollection}>Create Sample</Button> :
      <Button onClick={e => this._splitSelectionAsSubsamples()}>Split as Subsample(s)</Button>;

    return (
      <div>
        <ButtonGroup vertical block>
          {sampleNode}
          <Button disabled={isAllCollection}>Create Reaction</Button>
          <Button disabled={isAllCollection}>Create Wellplate</Button>
          <Button onClick={() => this.createScreen()} disabled={isAllCollection}>Create Screen</Button>
        </ButtonGroup>
      </div>
    )
  }
}
