import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Button, Input} from 'react-bootstrap';

import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';
import SuggestionActions from '../actions/SuggestionActions';
import SuggestionStore from '../stores/SuggestionStore';
import ElementActions from '../actions/ElementActions';

export default class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      apiEndpoint: '/api/v1/suggestions/all/',
      selection: null
    }
  }

  handleSelectionChange(selection) {
    console.log('Search-Selection: ');
    console.log(selection);

    this.setState({
      selection: selection
    });

    //ElementActions.fetchBasedOnSuggestions(selection);
  }

  search(query) {
    let promise = SuggestionsFetcher.fetchSuggestions(this.state.apiEndpoint, query);
    return promise;
  }

  handleSearch() {
    console.log('Search..');
  }

  handleElementSelection() {
    let val = this.refs.elementTypeSelect.getValue()

    this.setState({
      apiEndpoint: '/api/v1/suggestions/' + val + '/'
    })
  }

  render() {
    let searchButton = <Button onClick={() => this.handleSearch()}>S</Button>;

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
            <option value="all">All elements</option>
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
                             onSelectionChange={selection => this.handleSelectionChange(selection)}/>
        </div>
      </div>
    );
  }
}
