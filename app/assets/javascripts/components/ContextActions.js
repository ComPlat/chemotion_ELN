import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './stores/UIStore';
import ElementActions from './actions/ElementActions';
import SplitButton from './contextActions/SplitButton';
import CreateButton from './contextActions/CreateButton';

export default class ContextActions extends React.Component {
  constructor(props) {
    super(props);
    const uiState = UIStore.getState();
    this.state = {
      uiState
    }
  }

  componentDidMount() {
    UIStore.listen(state => this.onChange(state));
  }

  componentWillUnmount() {
    UIStore.unlisten(state => this.onChange(state));
  }

  onChange(state) {
    const uiState = state;
    this.setState({
      uiState
    });
  }

  isAllCollection() {
    const {currentCollection} = this.state.uiState;
    return currentCollection && currentCollection.id == 'all';
  }

  noSampleSelected() {
    const {sample} = this.state.uiState;
    return sample.checkedIds.size == 0;
  }

  render() {
    return (
      <ButtonGroup>
        <SplitButton isDisabled={this.noSampleSelected() || this.isAllCollection()}/>
        <CreateButton isDisabled={this.isAllCollection()}/>
      </ButtonGroup>
    )
  }
}
