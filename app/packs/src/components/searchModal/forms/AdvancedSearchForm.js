import React, { useState, useEffect, useContext } from 'react';
import { Button, ButtonToolbar, Panel, Alert } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import AdvancedSearchRow from './AdvancedSearchRow';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AdvancedSearchForm = ({ handleCancel }) => {
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
  const [searchParams, setSearchParams] = useState({});
  const searchResultsStore = useContext(StoreContext).searchResults;

  useEffect(() => {
    const length = selectedOptions.length - 1;
    const lastInputRow = selectedOptions[length];

    const checkSelectedElements =
      (lastInputRow.field && lastInputRow.value && lastInputRow.link) ||
      (length == 0 && lastInputRow.field && lastInputRow.value);

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
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const filters = filterSelectedOptions();

    if (filters.length > 0) {
      searchResultsStore.showSearchResults();
      searchResultsStore.changeErrorMessage("");

      const selection = {
        elementType: 'all',
        advanced_params: filters,
        search_by_method: 'advanced',
        page_size: uiState.number_of_results
      };
      setSearchParams({ selection, collectionId: collectionId, isSync: uiState.isSync });

      searchResultsStore.loadSearchResults({
        selection,
         collectionId: collectionId,
         isSync: uiState.isSync,
      });
    } else {
      searchResultsStore.changeErrorMessage("Please fill out all needed fields");
    }
  }

  const handleRefind = () => {
    searchResultsStore.clearSearchResults();
    setSelectedOptions(defaultSelections);
  }

  const showErrorMessage = () => {
    if (searchResultsStore.error_message) {
      return <Alert bsStyle="danger">{searchResultsStore.error_message}</Alert>;
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
            key={`selection_${id}`}
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
        <div style={{ position: 'relative' }}>
          <h4>Your Search</h4>
          {
            filters.map((val, i) => {
              return <div key={i}>{[val.link, val.field.label, val.match, val.value].join(" ")}</div>
            })
          }
          {
            searchResultsStore.searchResultsCount > 0 ? null : (
              <div className="search-spinner"><i className="fa fa-spinner fa-pulse fa-4x fa-fw" /></div>
            )
          }
        </div>
      );
    } else {
      return null;
    }
  }

  const searchResults = () => {
    if (searchResultsStore.searchResultsCount > 0) {
      return <SearchResult
                handleCancel={handleCancel}
                searchParams={searchParams}
                handleRefind={handleRefind}
              />;
    } else {
      return null;
    }
  }

  const formElementValue = (formElement, e) => {
    switch(formElement) {
      case 'value':
        return e.target.value;
        break;
      case 'field':
        return e.value;
        break;
      default:
        return e;
    }
  }

  const handleChangeSelection = (idx, formElement) => (e) => {
    let value = formElementValue(formElement, e);
    selectedOptions[idx][formElement] = value;
    setSelectedOptions((a) => [...a]);
  }

  const togglePanel = () => () => {
    if (searchResultsStore.searchResultsCount > 0) {
      searchResultsStore.toggleSearch();
      searchResultsStore.toggleSearchResults();
      searchResultsStore.clearTabCurrentPage();
    }
  }

  let defaultClassName = 'collapsible-search-result';
  let invisibleClassName = searchResultsStore.search_result_panel_visible ? '' : ' inactive';
  let inactiveSearchClass = !searchResultsStore.searchVisible ? 'inactive' : '';
  let inactiveResultClass = !searchResultsStore.searchResultVisible? 'inactive' : '';
  let searchIcon = `fa fa-chevron-${searchResultsStore.search_icon} icon-right`;
  let resultIcon = `fa fa-chevron-${searchResultsStore.result_icon} icon-right`;
  let searchTitle = searchResultsStore.searchVisible ? 'Search' : 'Refine search';
  let resultTitle = searchResultsStore.searchResultVisible ? 'Result' : 'Back to result';

  return (
    <>
      <Panel
        id="collapsible-search"
        className={defaultClassName}
        onToggle={togglePanel()}
        expanded={searchResultsStore.searchVisible}
      >
        <Panel.Heading className={inactiveSearchClass}>
          <Panel.Title toggle>
            {searchTitle}
            <i className={searchIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <div className="advanced-search">
              {showErrorMessage()}
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
        onToggle={togglePanel()}
        expanded={searchResultsStore.searchResultVisible}
      >
        <Panel.Heading className={inactiveResultClass}>
          <Panel.Title toggle>
            {resultTitle}
            <i className={resultIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{minHeight: '120px'}}>
            <SearchValuesList />
            {searchResults()}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(AdvancedSearchForm);
