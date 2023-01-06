import React, { useState, useEffect, useContext } from 'react';
import { Button, ButtonToolbar, Panel } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import AdvancedSearchRow from './AdvancedSearchRow';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AdvancedSearchForm = ({ handleCancel, currentState }) => {
  const defaultSelections = [{
    link: '',
    match: '=',
    field: {
      table: 'samples',
      column: 'name',
      label: 'Sample Name',
    },
    value: ''
  }];

  const [selectedOptions, setSelectedOptions] = useState(defaultSelections);
  //const [filters, setFilters] = useState([]);
  const searchResultsStore = useContext(StoreContext).searchResults;

  useEffect(() => {
    const length = selectedOptions.length - 1;
    const selection = selectedOptions[length];

    const checkSelectedElements =
      (selection.field && selection.value && selection.link) ||
      (length == 0 && selection.field && selection.value);

    if (checkSelectedElements) {
      selectedOptions.push({ link: 'OR', match: 'LIKE', field: '', value: '' });
      setSelectedOptions((a) => [...a]);
    }
  }, [selectedOptions, setSelectedOptions]);

  const filterSelectedOptions = () => {
    const filteredOptions = selectedOptions.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    });
    searchResultsStore.changeSearchFilter(filteredOptions);
    const storedFilter = searchResultsStore.searchFilters;
    return storedFilter.length == 0 ? [] : storedFilter[0].filters;
  }

  const handleSave = () => {
    const uiState = currentState;
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const filters = filterSelectedOptions();
    console.log('filters', filters);

    if (filters.length > 0) {
      searchResultsStore.showSearchResults();

      const selection = {
        elementType: 'all',
        advanced_params: filters,
        search_by_method: 'advanced',
        page_size: uiState.number_of_results
      };

      searchResultsStore.loadSearchResults({
        selection,
        collectionId: collectionId,
        isSync: uiState.isSync,
      });
    } else {
      searchResultsStore.hideSearchResults();
      // todo show error
      console.log('keine filter');
    }
  }

  const renderDynamicRow = () => {
    let dynamicRow = ( <span /> );

    if (selectedOptions.length > 1) {
      let addedSelections = selectedOptions.filter((val, idx) => idx > 0);

      dynamicRow = addedSelections.map((selection, idx) => {
        let id = idx + 1;
        return (
          <AdvancedSearchRow
            idx={id}
            selection={selection}
            key={"selection_" + id}
            onChange={handleChangeSelection}
          />
        );
      });
    }

    return dynamicRow;
  };

  const SearchValuesList = () => {
    const storedFilter = searchResultsStore.searchFilters;
    const filters = storedFilter.length == 0 ? filterSelectedOptions() : storedFilter[0].filters;
    
    if (searchResultsStore.searchResultVisible && filters.length > 0) {
      return (
        <>
          <div style={{ position: 'relative' }}>
            <h4>Your Search</h4>
            {
              filters.map((val, i) => {
                return <div key={i}>{[val.field.label, val.value].join(": ")}</div>
              })
            }
            {
              searchResultsStore.searchResultsCount > 0 ? null : (
                <div className="search-spinner"><i className="fa fa-spinner fa-pulse fa-4x fa-fw" /></div>
              )
            }
          </div>
        </>
      );
    } else {
      searchResultsStore.hideSearchResults();
      return null;
    }
  }

  const searchResults = () => {
    if (searchResultsStore.searchResultsCount > 0) {
      return <SearchResult searchValues={searchResultsStore.searchFilters[0].filters} />;
    } else {
      return null;
    }
  }

  const handleChangeSelection = (idx, formElement) => (e) => {
    let value = formElement == 'value' ? e.target.value : (formElement == 'field' ? e.value : e);
    selectedOptions[idx][formElement] = value;
    setSelectedOptions((a) => [...a]);
  }

  const togglePanel = (panel) => () => {
    if (searchResultsStore.searchResultsCount > 0) {
      if (panel == 'search') {
        searchResultsStore.toggleSearch();
      } else {
        searchResultsStore.toggleSearchResults();
      }
    }
  }

  let defaultClassName = 'collapsible-search-result';
  let invisibleClassName = searchResultsStore.searchResultVisible ? '' : ' inactive';

  return (
    <>
      <Panel
        id="collapsible-search"
        className={defaultClassName}
        onToggle={togglePanel('search')}
        expanded={searchResultsStore.searchVisible}
      >
        <Panel.Heading>
          <Panel.Title toggle>
            Search
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <div className="advanced-search">
              <div>
                <AdvancedSearchRow
                  idx={0}
                  selection={selectedOptions[0]}
                  key={"selection_0"}
                  onChange={handleChangeSelection}
                />
                {renderDynamicRow()}
              </div>
            </div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={handleCancel}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={handleSave} style={{ marginRight: '20px' }} >
                Search
              </Button>
            </ButtonToolbar>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel
        id="collapsible-result"
        className={defaultClassName + invisibleClassName}
        onToggle={togglePanel('result')}
        expanded={searchResultsStore.searchResultVisible}
      >
        <Panel.Heading>
          <Panel.Title toggle>
            Result
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <SearchValuesList />
            {searchResults()}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(AdvancedSearchForm);
