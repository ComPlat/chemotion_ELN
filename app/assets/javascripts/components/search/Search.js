import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Glyphicon, ButtonGroup, Button, DropdownButton, MenuItem, FormGroup, Radio}
  from 'react-bootstrap';
import Select from 'react-select'

import StructureEditorModal from '../structure_editor/StructureEditorModal'

import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';
import SuggestionActions from '../actions/SuggestionActions';
import SuggestionStore from '../stores/SuggestionStore';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';
import UIActions from '../actions/UIActions';
import UserStore from '../stores/UserStore';

export default class Search extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      elementType: 'all',
      showStructureEditor: false,
      queryMolfile: null
    }
  }

  handleSelectionChange(selection) {
    selection.elementType = this.state.elementType
    UIActions.setSearchSelection(selection)

    let uiState = UIStore.getState()
    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      uiState.currentCollection.id, 1)
  }

  search(query) {
    let userState = UserStore.getState()
    let uiState = UIStore.getState()
    let promise = SuggestionsFetcher.fetchSuggestionsForCurrentUser(
      '/api/v1/suggestions/' + this.state.elementType + '/',
      query, userState.currentUser.id, uiState.currentCollection.id)
    return promise
  }

  structureSearch(elementType, molfile, userId, collectionId) {
    let uiState = UIStore.getState()
    let selection = {
      elementType: elementType,
      molfile: molfile,
      page_size: uiState.number_of_results
    }
    UIActions.setSearchSelection(selection)

    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      collectionId, 1, 'structure')
  }

  handleClearSearchSelection() {
    let uiState = UIStore.getState()

    this.refs.autoComplete.setState({
      value: ''
    })

    UIActions.selectCollection({id: uiState.currentCollection.id})
    UIActions.clearSearchSelection()

    let autoComplete = this.refs.autoComplete
    autoComplete.setState({
      value : '',
      inputDisabled : false
    })
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    })
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    })
  }


  handleElementSelection(event) {
    this.setState({
      elementType: event
    })
  }

  handleStructureEditorSave(molfile) {
    if (molfile) {
      this.setState({queryMolfile: molfile});
    }
    // Check if blank molfile
    let molfileLines = molfile.match(/[^\r\n]+/g);
    // If the first character ~ num of atoms is 0, we will not search
    if (molfileLines[1].trim()[0] != 0) {
      let userState = UserStore.getState()
      let uiState = UIStore.getState()

      this.structureSearch(this.state.elementType, molfile,
                           userState.currentUser.id,
                           uiState.currentCollection.id)

      let autoComplete = this.refs.autoComplete
      autoComplete.setState({
        value : 'Structure Filter',
        inputDisabled : true
      })
    }

    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  renderMenuItems() {
    let elements = ["all", "samples", "reactions", "wellplates", "screens"]

    return elements.map((element) => {
      return (
        <MenuItem key={element}
            onSelect = {() => this.handleElementSelection(element)}>
          {element}
        </MenuItem>
      )
    })
  }

  render() {
    let buttonAfter =
      <ButtonGroup>
        <Button bsStyle = "primary" onClick={() => this.showStructureEditor()}>
          <Glyphicon glyph='pencil' id='AutoCompletedrawAddon' />
        </Button>
        <Button bsStyle = "danger"
                onClick={() => this.handleClearSearchSelection()}>
          <i className="fa fa-times"></i>
        </Button>
      </ButtonGroup>

    // let rightDropDown =
    //   <DropdownButton id="btn-search-dropdown" title="Choose"
    //                   onSelect={this.handleSelect}>
    //     <MenuItem eventKey="1">Similar Search</MenuItem>
    //     <MenuItem eventKey="2">Substructure Search</MenuItem>
    //     <MenuItem eventKey="3">Exact Search</MenuItem>
    //   </DropdownButton>

    let inputAttributes = {
      placeholder: 'IUPAC, InChI, SMILES, ...',
      style: {
        width: 300
      }
    }

    let suggestionsAttributes = {
      style: {
        marginTop: 15,
        width: 398,
        maxHeight: 400
      }
    }

    let innerDropdown =
      <DropdownButton id="search-inner-dropdown" title={this.state.elementType}
          style={{width:'100px'}}>
        {this.renderMenuItems()}
      </DropdownButton>

    return (
      <div className="chemotion-search">
        <div className="search-structure-draw">
          <StructureEditorModal
            showModal={this.state.showStructureEditor}
            onSave={this.handleStructureEditorSave.bind(this)}
            onCancel={this.handleStructureEditorCancel.bind(this)}
            molfile={this.state.queryMolfile}
            rightBtnText="Search"
            //rightDropDown={rightDropDown}
          />
        </div>
        <div className="search-autocomplete">
          <AutoCompleteInput
            inputAttributes={inputAttributes}
            suggestionsAttributes={suggestionsAttributes}
            suggestions={input => this.search(input)}
            ref="autoComplete"
            onSelectionChange={selection=>this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}
            buttonAfter={buttonAfter}
          />
        </div>
      </div>
    )
  }
}
