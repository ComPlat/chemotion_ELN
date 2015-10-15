import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Button, Input, DropdownButton, MenuItem} from 'react-bootstrap';

import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';
import SuggestionActions from '../actions/SuggestionActions';
import SuggestionStore from '../stores/SuggestionStore';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';
import UIActions from '../actions/UIActions';

export default class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      elementType: 'all'
    }
  }

  handleSelectionChange(selection) {
    selection.elementType = this.state.elementType;
    UIActions.setSearchSelection(selection);

    let uiState = UIStore.getState();
    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection, uiState.currentCollection.id);
  }

  search(query) {
    let promise = SuggestionsFetcher.fetchSuggestions('/api/v1/suggestions/' + this.state.elementType + '/', query);
    return promise;
  }

  handleClearSearchSelection() {
    let uiState = UIStore.getState();

    this.refs.autoComplete.setState({
      value: ''
    })

    UIActions.selectCollection({id: uiState.currentCollection.id});
    UIActions.clearSearchSelection();
  }

  handleElementSelection(event) {
    this.setState({
      elementType: event
    })
  }

  renderMenuItems() {
    let elements = ["all", "samples", "reactions", "wellplates", "screens"];
    return elements.map((element, index) => {
      return (
        <MenuItem key={element} onSelect={() => this.handleElementSelection(element)}>
          {element}
        </MenuItem>
      );
    });
  }

  render() {
    let searchButton = <Button bsStyle="danger" onClick={() => this.handleClearSearchSelection()}><i className="fa fa-times"></i></Button>;

    let inputAttributes = {
      placeholder: 'Search for elements...',
      buttonAfter: searchButton,
      style: {
        width: 300
      }
    };

    let suggestionsAttributes = {
      style: {
        marginTop: 15,
        width: 400
      }
    };

    let innerDropdown = 
      <DropdownButton title={this.state.elementType} style={{width:'100px'}}>
        {this.renderMenuItems()}
      </DropdownButton>

    return (
      <div className="chemotion-search">
        <div className="search-autocomplete">
          <AutoCompleteInput inputAttributes={inputAttributes}
                             suggestionsAttributes={suggestionsAttributes}
                             suggestions={input => this.search(input)}
                             ref="autoComplete"
                             onSelectionChange={selection => this.handleSelectionChange(selection)}
                             buttonBefore={innerDropdown}/>
        </div>
      </div>
    );
  }
}
