import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Button, Input} from 'react-bootstrap';

import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';
import SuggestionActions from '../actions/SuggestionActions';
import SuggestionStore from '../stores/SuggestionStore';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';
import UIActions from '../actions/UIActions';
import UserStore from '../stores/UserStore';

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
    ElementActions.fetchBasedOnSearchSelectionAndCollection(selection, uiState.currentCollection.id, 1);
  }

  search(query) {
    let userState = UserStore.getState();
    let promise = SuggestionsFetcher.fetchSuggestionsForCurrentUser('/api/v1/suggestions/' + this.state.elementType + '/', query, userState.currentUser.id);
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

  handleElementSelection() {
    let val = this.refs.elementTypeSelect.getValue()

    this.setState({
      elementType: val
    })
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
        width: 300
      }
    };

    return (
      <div className="chemotion-search">
        <div className="search-elements-select">
          <Input ref="elementTypeSelect" type="select" onChange={() => this.handleElementSelection()}>
            <option value="all">All</option>
            <option value="samples">Samples</option>
            <option value="reactions">Reactions</option>
            <option value="wellplates">Wellplates</option>
            <option value="screens">Screens</option>
          </Input>
        </div>
        <div className="search-autocomplete">
          <AutoCompleteInput inputAttributes={inputAttributes}
                             suggestionsAttributes={suggestionsAttributes}
                             suggestions={input => this.search(input)}
                             ref="autoComplete"
                             onSelectionChange={selection => this.handleSelectionChange(selection)}/>
        </div>
      </div>
    );
  }
}
