import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import SplitButton from './SplitButton';
import CreateButton from './CreateButton';
import ReportButton from './ReportButton';

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
    return currentCollection && currentCollection.label == 'All';
  }

  noSampleSelected() {
    const {sample} = this.state.uiState;
    return sample.checkedIds.size == 0 && sample.checkedAll == false;
  }

  render() {
    return (
      <ButtonGroup>
        <SplitButton isDisabled={this.noSampleSelected() || this.isAllCollection()}/>
        <ReportButton />
        <CreateButton isDisabled={this.isAllCollection()}/>
      </ButtonGroup>
    )
  }
}
