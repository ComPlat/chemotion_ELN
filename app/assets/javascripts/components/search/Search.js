import alt from 'alt';
import React from 'react';
import { Glyphicon, ButtonGroup, Button, DropdownButton, MenuItem,
  Form, FormControl, Radio, Grid, Row, Col } from 'react-bootstrap';
import PropTypes from 'prop-types';

import AutoCompleteInput from './AutoCompleteInput';
import StructureEditorModal from '../structure_editor/StructureEditorModal';
import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';
import UIActions from '../actions/UIActions';

export default class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elementType: 'All',
      showStructureEditor: false,
      queryMolfile: null,
      searchType: 'similar',
      tanimotoThreshold: 0.7
    };
    this.handleClearSearchSelection = this.handleClearSearchSelection.bind(this);
  }

  handleSelectionChange(selection) {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isPublic = this.props.isPublic;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    selection.elementType = this.state.elementType;
    UIActions.setSearchSelection(selection);
    selection.page_size = uiState.number_of_results;
    ElementActions.fetchBasedOnSearchSelectionAndCollection(
      { selection, collectionId, isSync, isPublic });
  }

  search(query) {
    const { currentCollection } = UIStore.getState();
    const id = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    return SuggestionsFetcher.fetchSuggestionsForCurrentUser(
      this.state.elementType.toLowerCase(), query, id, isSync
    );
  }

  structureSearch(molfile) {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    const isPublic = this.props.isPublic;
    let tanimoto = this.state.tanimotoThreshold;
    if (tanimoto <= 0 || tanimoto > 1) { tanimoto = 0.3; }

    const selection = {
      elementType: this.state.elementType,
      molfile,
      search_type: this.state.searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results,
      search_by_method: 'structure',
      structure_search: true
    };
    UIActions.setSearchSelection(selection);
    ElementActions.fetchBasedOnSearchSelectionAndCollection(
      { selection, collectionId, isSync, isPublic });
  }

  handleClearSearchSelection() {
    const { currentCollection, isSync } = UIStore.getState();
    currentCollection['clearSearch'] = true;
    isSync ? UIActions.selectSyncCollection(currentCollection)
      : UIActions.selectCollection(currentCollection);
  }

  showStructureEditor() {
    this.setState({ showStructureEditor: true });
  }

  showAdvancedSearch() {
    UIActions.toggleAdvancedSearch(true);
  }

  hideStructureEditor() {
    this.setState({ showStructureEditor: false });
  }


  handleElementSelection(event) {
    this.setState({ elementType: event });
  }

  handleStructureEditorSave(molfile) {
    if (molfile) { this.setState({ queryMolfile: molfile }); }
    // Check if blank molfile
    const molfileLines = molfile.match(/[^\r\n]+/g);
    // If the first character ~ num of atoms is 0, we will not search
    if (molfileLines[1].trim()[0] !== 0) {
      this.structureSearch(molfile);
    }
    this.hideStructureEditor();
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor();
  }

  handleTanimotoChange(e) {
    const val = e.target && e.target.value;
    if (!isNaN(val - val)) {
      this.setState({ tanimotoThreshold: val });
    }
  }

  handleSearchTypeChange(e) {
    this.setState({ searchType: e.target && e.target.value });
  }

  renderMenuItems() {
    const elements = [
      "All",
      "Samples", "Reactions",
      "Wellplates", "Screens"
    ]

    const menu = elements.map(element => (
      <MenuItem key={element} onSelect={() => this.handleElementSelection(element.toLowerCase())}>
        {element}
      </MenuItem>
    ));

    menu.push(<MenuItem key="divider" divider />);
    menu.push(
      <MenuItem key="advanced" onSelect={this.showAdvancedSearch}>
        Advanced Search
      </MenuItem>
    );

    return menu;
  }

  render() {
    const buttonAfter = (
      <ButtonGroup>
        <Button bsStyle="primary" onClick={() => this.showStructureEditor()}>
          <Glyphicon glyph="pencil" id="AutoCompletedrawAddon" />
        </Button>
        <Button bsStyle="danger" onClick={this.handleClearSearchSelection}>
          <i className="fa fa-times" />
        </Button>
      </ButtonGroup>
    );

    const submitAddons = (
      <Grid><Row>
        <Col sm={6} md={4}>
          <Form inline>
            <Radio
              ref="searchSimilarRadio"
              value="similar"
              checked={this.state.searchType === 'similar'}
              onChange={e => this.handleSearchTypeChange(e)}
            >
              &nbsp; Similarity Search &nbsp;
            </Radio>
            &nbsp;&nbsp;
            <FormControl
              style={{ width: '40%' }}
              type="text"
              value={this.state.tanimotoThreshold}
              ref="searchTanimotoInput"
              onChange={e => this.handleTanimotoChange(e)}
            />
          </Form>
        </Col>
        <Col sm={4} md={2}>
          <Radio
            ref="searchSubstructureRadio"
            value="sub"
            checked={this.state.searchType === 'sub'}
            onChange={e => this.handleSearchTypeChange(e)}
          >
            Substructure Search
          </Radio>
        </Col>
      </Row></Grid>
    );

    const inputAttributes = {
      placeholder: 'IUPAC, InChI, SMILES, ...',
      style: { width: 300 }
    };

    const suggestionsAttributes = {
      style: {
        marginTop: 15,
        width: 398,
        maxHeight: 400
      }
    };

    const innerDropdown = (
      <DropdownButton id="search-inner-dropdown" title={this.state.elementType} style={{ width: '100px' }}>
        {this.renderMenuItems()}
      </DropdownButton>
    );

    return (
      <div className="chemotion-search">
        <div className="search-structure-draw">
          <StructureEditorModal
            showModal={this.state.showStructureEditor}
            onSave={this.props.noSubmit ? null : this.handleStructureEditorSave.bind(this)}
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
            onSelectionChange={selection => this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}
            buttonAfter={buttonAfter}
          />
        </div>
      </div>
    );
  }
}

Search.propTypes = {
  noSubmit: PropTypes.bool
};

Search.defaultProps = {
  noSubmit: false,
};
