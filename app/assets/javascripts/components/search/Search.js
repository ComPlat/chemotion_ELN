import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Glyphicon, ButtonGroup, Button, DropdownButton, MenuItem,
        Form, FormGroup, FormControl, HelpBlock, Radio, Grid, Row, Col}
  from 'react-bootstrap';

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
      queryMolfile: null,
      searchType: 'similar',
      tanimotoThreshold: 0.7
    }
  }

  handleSelectionChange(selection) {
    let uiState = UIStore.getState()
    selection.elementType = this.state.elementType
    UIActions.setSearchSelection(selection)
    selection.page_size = uiState.number_of_results

    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      uiState.currentCollection.id, 1, uiState.isSync)
  }

  search(query) {
    let userState = UserStore.getState()
    let uiState = UIStore.getState()
    let promise = SuggestionsFetcher.fetchSuggestionsForCurrentUser(
      '/api/v1/suggestions/' + this.state.elementType + '/',
      query, userState.currentUser.id, uiState.currentCollection.id)
    return promise
  }

  structureSearch(molfile) {
    let uiState = UIStore.getState()
    let userState = UIStore.getState()

    let tanimoto = this.state.tanimotoThreshold
    if (tanimoto <= 0 || tanimoto > 1) tanimoto = 0.3

    let selection = {
      elementType: this.state.elementType,
      molfile: molfile,
      search_type: this.state.searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results,
      structure_search: true
    }
    UIActions.setSearchSelection(selection)

    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      uiState.currentCollection.id, 1, uiState.isSync)
  }

  handleClearSearchSelection() {
    let uiState = UIStore.getState()

    UIActions.selectCollection({id: uiState.currentCollection.id})
    UIActions.clearSearchSelection()
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    })
  }

  showAdvancedSearch() {
    UIActions.toggleAdvancedSearch(true)
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
      this.structureSearch(molfile)
    }

    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  handleTanimotoChange(e) {
    if (!isNaN(e.target.value - e.target.value)) {
      let val = e.target.value
      this.setState({
        tanimotoThreshold: val
      })
    }
  }

  handleSearchTypeChange(e) {
    let val = e.target.value
    this.setState({
      searchType: e.target.value
    })
  }

  renderMenuItems() {
    let elements = [
      "All",
      "Samples", "Reactions",
      "Wellplates", "Screens"
    ]

    let menu = elements.map((element) => {
      return (
        <MenuItem key={element}
            onSelect = {() => this.handleElementSelection(element)}>
          {element}
        </MenuItem>
      )
    })

    menu.push(<MenuItem key="divider" divider/>)
    menu.push(
      <MenuItem key="advanced" onSelect={this.showAdvancedSearch}>
        Advanced Search
      </MenuItem>
    )

    return menu
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

    let submitAddons =
      <Grid><Row>
        <Col sm={6} md={4}>
          <Form inline>
            <Radio ref="searchSimilarRadio" value="similar"
                   checked={this.state.searchType == 'similar' ? true : false}
                   onChange={(e) => this.handleSearchTypeChange(e)}>
              &nbsp; Similarity Search &nbsp;
            </Radio>
            &nbsp;&nbsp;
            <FormControl style={{width: '40%'}} type="text"
                         value={this.state.tanimotoThreshold}
                         ref="searchTanimotoInput"
                         onChange={(e) => this.handleTanimotoChange(e)}
            />
          </Form>
        </Col>
        <Col sm={4} md={2}>
          <Radio ref="searchSubstructureRadio" value="sub"
                 checked={this.state.searchType == 'sub' ? true : false}
                 onChange={(e) => this.handleSearchTypeChange(e)}>
            Substructure Search
          </Radio>
        </Col>
      </Row></Grid>

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

    let innerDropdown = (
      <DropdownButton id="search-inner-dropdown" title={this.state.elementType}
          style={{width:'100px'}}>
        {this.renderMenuItems()}
      </DropdownButton>
    )

    return (
      <div className="chemotion-search">
        <div className="search-structure-draw">
          <StructureEditorModal
            showModal={this.state.showStructureEditor}
            onSave={this.handleStructureEditorSave.bind(this)}
            onCancel={this.handleStructureEditorCancel.bind(this)}
            molfile={this.state.queryMolfile}
            submitBtnText="Search"
            submitAddons={submitAddons}
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
