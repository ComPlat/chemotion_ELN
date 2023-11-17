import React from 'react';
import { Alert } from 'react-bootstrap';

const togglePanel = (store) => () => {
  if (store.searchResultsCount > 0) {
    store.toggleSearch();
    store.toggleSearchResults();
    store.clearTabCurrentPage();
  }
}

const showErrorMessage = (store) => {
  if (store.errorMessages.length >= 1) {
    return <Alert bsStyle="danger">{store.errorMessages.join(', ')}</Alert>;
  }
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

export { togglePanel, showErrorMessage, panelVariables }
