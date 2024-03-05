import React from 'react';
import { Alert } from 'react-bootstrap';

const togglePanel = (store) => () => {
  if (store.searchResultsCount > 0) {
    store.toggleSearch();
    store.toggleSearchResults();
    store.clearTabCurrentPage();
  }
}

const handleClear = (store) => {
  store.clearSearchResults();
}

const showErrorMessage = (store) => {
  if (store.errorMessages.length >= 1) {
    return <Alert bsStyle="danger">{store.errorMessages.join(', ')}</Alert>;
  }
}

const filterSearchValues = (store) => {
  let filteredOptions = [];

  if (store.detail_search_values.length >= 1) {
    store.detailSearchValues.map((f, i) => {
      let values = { ...Object.values(f)[0] };
      if (values.value != '') {
        filteredOptions.push(values);
      }
    });
    if (filteredOptions[0]) {
      filteredOptions[0].link = '';
    }
  } else {
    let searchValues =
      store.searchModalSelectedForm.value == 'publication' ? store.publicationSearchValues : store.advancedSearchValues;
    filteredOptions = searchValues.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    });
  }
  store.changeSearchFilter(filteredOptions);
  const storedFilter = store.searchFilters;
  return storedFilter.length == 0 ? [] : storedFilter[0].filters;
}

const handleSearch = (store, uiState) => {
  const { currentCollection } = uiState;
  const collectionId = currentCollection ? currentCollection.id : null;
  const filters = filterSearchValues(store);
  let message = 'Please fill out all needed fields';
  store.addErrorMessage(message);

  if (filters.length > 0 && store.errorMessages.length == 1) {
    store.showSearchResults();
    store.removeErrorMessage(message);

    const selection = {
      elementType: 'advanced',
      advanced_params: filters,
      search_by_method: 'advanced',
      page_size: uiState.number_of_results
    };

    store.loadSearchResults({
      selection,
      collectionId: collectionId,
      isSync: uiState.isSync,
      moleculeSort: true,
    });
    store.clearSearchAndTabResults();
    searchValuesByFilters(store);
  }
}

const searchValuesBySubFields = (val, table) => {
  let label = '';
  let value = '';
  let unit = '';
  let match = val.match;
  let searchValues = [];

  val.field.sub_fields.map((sub) => {
    if (sub.type == 'label') {
      label = sub.value;
    } else if (val.sub_values[0][sub.id]) {
      let subContent = val.sub_values[0][sub.id];
      if (subContent.value !== undefined) {
        value = subContent.value;
        unit = subContent.value_system;
        label = sub.col_name;
        match = '>=';
      } else {
        value = subContent;
        label = label === '' ? sub.col_name : label;
      }
      searchValues.push([val.link, table, `${val.field.label.toLowerCase()}: ${label.toLowerCase()}`, match, value, unit].join(" "));
    } else if (val.sub_values[0][sub.key]) {
      value = val.sub_values[0][sub.key];
      searchValues.push([val.link, table, `${val.field.label.toLowerCase()}: ${sub.label.toLowerCase()}`, val.match, value, unit].join(" "));
    }
  });
  return searchValues;
}

const searchValuesByFilters = (store) => {
  const storedFilter = store.searchFilters;
  const filters = storedFilter.length == 0 ? [] : storedFilter[0].filters;
  let searchValues = [];

  if (store.searchResultVisible && filters.length > 0) {
    filters.map((val) => {
      let table = val.field.table || val.table;
      let value = val.value;
      table = table.charAt(0).toUpperCase() + table.slice(1, -1).replace('_', ' ');
      value = value != true ? value.replace(/[\n\r]/g, ' OR ') : value;

      if (val.field.sub_fields && val.field.sub_fields.length >= 1 && val.sub_values.length >= 1) {
        let values = searchValuesBySubFields(val, table);
        searchValues.push(...values);
      } else {
        searchValues.push([val.link, table, val.field.label.toLowerCase(), val.match, value, val.unit].join(" "));
      }
    });
  }
  store.changeSearchValues(searchValues);
}

const panelVariables = (store) => {
  let variables = [
    {
      defaultClassName: 'collapsible-search-result',
      invisibleClassName: (store.search_result_panel_visible ? '' : ' inactive'),
      inactiveSearchClass: (!store.searchVisible ? 'inactive' : ''),
      inactiveResultClass: (!store.searchResultVisible ? 'inactive' : ''),
      searchIcon: `fa fa-chevron-${store.search_icon} icon-right`,
      resultIcon: `fa fa-chevron-${store.result_icon} icon-right`,
      searchTitle: (store.searchVisible ? 'Search' : 'Refine search'),
      resultTitle: (store.searchResultVisible ? 'Result' : 'Back to result'),
    }
  ];
  return variables[0];
}

export { togglePanel, handleClear, showErrorMessage, handleSearch, panelVariables }
