import React from 'react';
import {Button, ButtonToolbar, Radio, FormGroup} from 'react-bootstrap';
import PropTypes from 'prop-types';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import ReportsFetcher from './../fetchers/ReportsFetcher';

export default class ModalReactionExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 3
    }
    this.handleClick = this.handleClick.bind(this)
  }

  buttonBar() {
    const { onHide } = this.props;
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button bsStyle="warning" id="md-export-dropdown"
                title="Reaction Smiles CSV Export" onClick={this.handleClick}>
                Smiles Export
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>

    )
  }

  handleClick() {
    const uiState = UIStore.getState();
    const userState = UserStore.getState();
    const { onHide } = this.props;
    onHide();
    exportSelections(uiState, userState, this.state.value);
  }

  render() {
    const onChange = (v) => this.setState(
      previousState => {return { ...previousState, value: v }}
    )
    return (
      <div>
        <div className='export-container'>
            <FormGroup  name="options" value={this.state.value} >
              <Radio onChange={()=>onChange(0)} checked={this.state.value == 0} value={0}>starting_materials &gt;&gt; products</Radio>
              <Radio onChange={()=>onChange(1)} checked={this.state.value == 1} value={1}>starting_materials.reactants &gt;&gt; products</Radio>
              <Radio onChange={()=>onChange(2)} checked={this.state.value == 2} value={2}>starting_materials.reactants.solvents &gt;&gt; products</Radio>
              <Radio onChange={()=>onChange(3)} checked={this.state.value == 3} value={3}>starting_materials &gt; reactants &gt; products</Radio>
              <Radio onChange={()=>onChange(4)} checked={this.state.value == 4} value={4}>starting_materials &gt; reactants.solvents &gt; products</Radio>
              <Radio onChange={()=>onChange(5)} checked={this.state.value == 5} value={5}>starting_materials &gt; reactants &gt; solvents &gt; products</Radio>
              <Radio onChange={()=>onChange(6)} checked={this.state.value == 6} value={6}>starting_materials , reactants , solvents , products</Radio>
            </FormGroup>
        </div>
        {this.buttonBar()}
      </div>
    )
  }
}

ModalReactionExport.propTypes = {
  onHide: PropTypes.func,
}

const exportSelections = (uiState, userState, e) => {
  ReportsFetcher.createDownloadFile({
    exportType: e,
    uiState: filterUIState(uiState),
    columns: []
  },'', 'export_reactions_from_selections');
}

const filterUIState = (uiState) =>{
  const { currentCollection, elements, isSync } = uiState;
  return {
    elements: {
      sample: {
        checkedIds: elements['sample'].checkedIds.toArray(),
        uncheckedIds: elements['sample'].uncheckedIds.toArray(),
        checkedAll: elements['sample'].checkedAll,
      },
      reaction: {
        checkedIds: elements['reaction'].checkedIds.toArray(),
        uncheckedIds: elements['reaction'].uncheckedIds.toArray(),
        checkedAll: elements['reaction'].checkedAll,
      },
      wellplate: {
        checkedIds: elements['wellplate'].checkedIds.toArray(),
        uncheckedIds: elements['wellplate'].uncheckedIds.toArray(),
        checkedAll: elements['wellplate'].checkedAll,
      }
    },
    currentCollection: currentCollection.id,
    isSync: isSync,
  }
}
