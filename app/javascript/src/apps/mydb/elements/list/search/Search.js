import React from 'react';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';

import AutoCompleteInput from 'src/apps/mydb/elements/list/search/AutoCompleteInput';
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
    const { isPublic } = this.props;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    const { elementType } = this.state;
    const updatedSelection = {
      ...selection,
      elementType,
      page_size: uiState.number_of_results,
    };
    UIActions.setSearchSelection(updatedSelection);
    ElementActions.fetchBasedOnSearchSelectionAndCollection(
      {
        selection: updatedSelection, collectionId, isSync, isPublic
      }
    );
  }

  handleClearSearchSelection() {
    const { currentCollection } = UIStore.getState();
    const { elementType: _elementType, ...restState } = this.state;
    this.setState({ ...restState, elementType: 'all' })
    const updatedCollection = { ...currentCollection, clearSearch: true };
    UIActions.selectCollection(updatedCollection);
  }

  handleElementSelection(event, element = null) {
    if (event.startsWith('elements-')) {
      this.showGenericElCriteria();
      this.setState({ elementType: 'elements', genericEl: element });
    } else {
      this.setState({ elementType: event });
    }
  }

  search(query) {
    const { currentCollection } = UIStore.getState();
    const id = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    const { elementType } = this.state;
    return SuggestionsFetcher.fetchSuggestionsForCurrentUser(elementType.toLowerCase(), query, id, isSync);
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
      { label: 'Device Descriptions', value: 'device_descriptions' },
    ];

    const buttonAfter = (
      <Button variant="light" size="sm" onClick={this.handleClearSearchSelection}>
        <i className="fa fa-times" />
      </Button>
    );

    const searchIcon = (elementType) => {
      const { genericEl } = this.state;
      if (elementType === 'all') return 'All';
      if (elements.find((e) => e.value === elementType)) {
        return (<i className={`icon-${elementType.slice(0, -1)}`} />);
      }
      if (genericEl) return (<i className={genericEl.icon_name} />);
      return elementType;
    };

    const { elementType } = this.state;
    const innerDropdown = (
      <DropdownButton
        variant="light"
        size="sm"
        id="search-inner-dropdown"
        title={searchIcon(elementType)}
      >
        {elements.map((element) => (
          <Dropdown.Item key={element.value} onClick={() => this.handleElementSelection(element.value)}>
            {element.label}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    );

    return (
      <>
        <SearchModal />
        <div className="d-flex align-items-center flex-nowrap gap-2">
          <AutoCompleteInput
            suggestions={(input) => this.search(input)}
            onSelectionChange={(selection) => this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}
            buttonAfter={buttonAfter}
          />
          <Button
            variant="light"
            size="sm"
            id="open-search-modal"
            onClick={() => {
              const { search } = this.context;
              search.showSearchModal();
            }}
          >
            Advanced
          </Button>
        </div>
      </>
    );
  }
}
