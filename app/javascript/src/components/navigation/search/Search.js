import React from 'react';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';
import PropTypes from 'prop-types';

import AutoCompleteInput from 'src/components/navigation/search/AutoCompleteInput';
import SearchModal from 'src/components/searchModal/SearchModal';
import SuggestionsFetcher from 'src/fetchers/SuggestionsFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class Search extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      elementType: 'all',
      queryMolfile: null,
      searchType: 'sub',
      tanimotoThreshold: 0.7,
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

  handleClearSearchSelection() {
    const { currentCollection } = UIStore.getState();
    this.setState({ elementType: 'all' })
    currentCollection['clearSearch'] = true;
    UIActions.selectCollection(currentCollection);
  }

  handleElementSelection(event, element = null) {
    if (event.startsWith('elements-')) {
      this.showGenericElCriteria();
      this.setState({ elementType: 'elements', genericEl: element });
    } else {
      this.setState({ elementType: event });
    }
  }

  render() {
    const elements = [
      { label: 'All', value: 'all' },
      { label: 'Samples', value: 'samples' },
      { label: 'Reactions', value: 'reactions' },
      { label: 'Wellplates', value: 'wellplates' },
      { label: 'Screens', value: 'screens' },
      { label: 'Cell lines', value: 'cell_lines' },
      { label: 'Sequence Based Macromolecule Samples', value: 'sequence_based_macromolecule_samples' },
    ];

    const buttonAfter = (
      <>
        <Button variant="info" id="open-search-modal" onClick={() => this.context.search.showSearchModal()}>
          <i className="fa fa-search" />
        </Button>
        <Button variant="danger" onClick={this.handleClearSearchSelection}>
          <i className="fa fa-times" />
        </Button>
      </>
    );

    const searchIcon = (elementType) => {
      if (elementType === 'all') return 'All';
      if (elements.find((e) => e.value === elementType)) {
        return (<i className={`icon-${elementType.slice(0, -1)}`} />);
      }
      if (this.state.genericEl) return (<i className={this.state.genericEl.icon_name} />);
      return elementType;
    }

    const innerDropdown = (
      <DropdownButton
        variant="light"
        id="search-inner-dropdown"
        title={searchIcon(this.state.elementType)}
      >
        {elements.map(element => (
          <Dropdown.Item key={element.value} onClick={() => this.handleElementSelection(element.value)}>
            {element.label}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    );

    return (
      <>
        <SearchModal />
        <div className="d-flex align-items-center flex-nowrap">
          <AutoCompleteInput
            suggestions={input => this.search(input)}
            ref={(input) => { this.autoComplete = input; }}
            onSelectionChange={selection => this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}
            buttonAfter={buttonAfter}
          />
        </div>
      </>
    );
  }
}
