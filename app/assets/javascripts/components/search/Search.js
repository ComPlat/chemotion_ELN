import alt from 'alt'
import React from 'react'
import AutoCompleteInput from './AutoCompleteInput'
import {Glyphicon, Button, Input, DropdownButton, MenuItem}
  from 'react-bootstrap'
import Select from 'react-select'

import StructureEditorModal from '../structure_editor/StructureEditorModal'

import SuggestionsFetcher from '../fetchers/SuggestionsFetcher'
import ElementActions from '../actions/ElementActions'
import UIStore from '../stores/UIStore'
import UIActions from '../actions/UIActions'
import UserStore from '../stores/UserStore'

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

  handleClearSearchSelection() {
    let uiState = UIStore.getState()

    this.refs.autoComplete.setState({
      value: ''
    })

    UIActions.selectCollection({id: uiState.currentCollection.id})
    UIActions.clearSearchSelection()
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

  handleStructureEditorSave(molfile, svg_file = null) {
    if (molfile) {
      this.state.queryMolfile = molfile
    }

    this.search(molfile)

    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  renderMenuItems() {
    let elements = ["all", "samples", "reactions", "wellplates", "screens"]

    return elements.map((element, index) => {
      return (
        <MenuItem
          key={element} onSelect={() => this.handleElementSelection(element)}>
          {element}
        </MenuItem>
      )
    })
  }

  render() {
    let molfile = null
    let drawAddon =
      <Glyphicon glyph='pencil' style={{cursor: 'pointer'}}
        onClick={() => this.showStructureEditor()} />

    let searchButton =
      <Button bsStyle="danger"
          onClick={() => this.handleClearSearchSelection()}>
        <i className="fa fa-times"></i></Button>
    let inputAttributes = {
      placeholder: 'IUPAC, InChI, SMILES, ...',
      // Uncomment this line to add the draw button
      addonAfter: drawAddon,
      buttonAfter: searchButton,
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
          />
        </div>
        <div className="search-autocomplete">
          <AutoCompleteInput
            inputAttributes={inputAttributes}
            suggestionsAttributes={suggestionsAttributes}
            suggestions={input => this.search(input)}
            ref="autoComplete"
            onSelectionChange={selection=>this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}/>
        </div>
      </div>
    )
  }
}
