import alt from 'alt';
import React from 'react';
import AutoCompleteInput from './AutoCompleteInput';
import {Button, Input} from 'react-bootstrap';
import 'whatwg-fetch';

export default class Search extends React.Component {
  constructor(props) {
    super(props);
  }

  handleSelectionChange(selection) {
    console.log('Search-Selection: ');
    console.log(selection);
  }

  search(query) {
    /* TODO replace me with flux-pattern!
     auto-complete requires a promise, so when the suggestions of the store change,
     a new Promise with resolve(suggestions) should be created
     */

    let promise = fetch('/api/v1/search/' + query + '.json', {
      credentials: 'same-origin'
    }).then(response => {
      return response.json();
    }).then(json => {
      return json.suggestions;
    }).catch(errorMessage => {
    });
    return promise;
  }

  handleSearch(){
    console.log('Search..');
  }

  render() {
    let searchButton = <Button onClick={() => this.handleSearch()}>S</Button>;

    let inputAttributes = {
      placeholder: 'Search for food...',
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
          <Input type="select">
            <option value="all">All elements</option>
            <option value="samples">Samples</option>
            <option value="reaction">Reactions</option>
            <option value="wellplate">Wellplates</option>
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
