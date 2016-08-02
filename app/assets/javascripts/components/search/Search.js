import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Glyphicon, ButtonGroup, Button, DropdownButton, MenuItem,
        Form, FormGroup, FormControl, HelpBlock, Radio, Grid, Row, Col}
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
      queryMolfile: null,
      searchType: 'similar',
      tanimotoThreshold: 0.7
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

  structureSearch(molfile) {
    let uiState = UIStore.getState()
    let userState = UIStore.getState()
    let tanimoto = this.state.tanimotoThreshold
    if (tanimoto <= 0 || tanimoto > 1)
      tanimoto = 0.3
    let selection = {
      elementType: this.state.elementType,
      molfile: molfile,
      search_type: this.state.searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results
    }
    UIActions.setSearchSelection(selection)

    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection,
      uiState.currentCollection.id, 1, 'structure')
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
      this.structureSearch(molfile)

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

    let rightAddons =
      <Grid><Row>
        <Col sm={5} md={3}>
          <Form inline>
            <Radio ref="searchSimilarRadio" value="similar"
                   checked={this.state.searchType == 'similar' ? true : false}
                   onChange={(e) => this.handleSearchTypeChange(e)}>
              Similar Search
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
            rightAddons={rightAddons}
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
