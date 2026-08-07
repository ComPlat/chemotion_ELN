/* eslint-disable react/prop-types */
import React, { useContext } from 'react';
import {
  Alert, AccordionContext, useAccordionButton, ButtonToolbar, Button
} from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';

const togglePanel = (store) => () => {
  if (store.searchResultsCount > 0) {
    store.toggleSearch();
    store.toggleSearchResults();
    store.clearTabCurrentPage();
  }
};

const handleClear = (store) => {
  store.clearSearchResults();
};

const showErrorMessage = (store) => {
  if (store.errorMessages.length >= 1) {
    return (
      <Alert variant="danger" className="flex-shrink-1" id="search-error-message">
        {store.errorMessages.join(', ')}
      </Alert>
    );
  }
};

const filterSearchValues = (store) => {
  const filteredOptions = [];

  if (store.detail_search_values.length >= 1) {
    store.detailSearchValues.forEach((f) => {
      const keys = { ...Object.keys(f) };
      const values = { ...Object.values(f)[0] };

      if (values.value !== '') {
        if (keys[0] === 'version_identifier_type') {
          const fieldValues = { ...values.field };
          fieldValues.column = keys[0];
          values.field = fieldValues;
          filteredOptions.push(values);
        } else {
          filteredOptions.push(values);
        }
      }
    });
    if (filteredOptions[0]) {
      filteredOptions[0].link = '';
    }
  } else {
    const isPublication = store.searchModalSelectedForm.value === 'publication';
    const searchValues = isPublication ? store.publicationSearchValues : store.advancedSearchValues;
    searchValues.forEach((f, id) => {
      const isValid = (f.field && f.link && f.value) || (id === 0 && f.field && f.value);
      if (isValid) {
        filteredOptions.push({ ...f });
      }
    });
    if (!isPublication) {
      store.resetAdvancedSearchValue();
      if (filteredOptions[0]) {
        filteredOptions[0].link = '';
      }
      filteredOptions.forEach((f, id) => { store.addAdvancedSearchValue(id, f); });
    }
  }
  store.changeSearchFilter(filteredOptions);
  const storedFilter = store.searchFilters;
  return storedFilter.length === 0 ? [] : storedFilter[0].filters;
};

const searchValuesBySubFields = (val, table) => {
  let label = '';
  let value = '';
  let unit = '';
  let { match } = val;
  const searchValues = [];

  val.field.sub_fields.map((sub) => {
    if (sub.type === 'label') {
      label = sub.value;
    } else if (val.sub_values[0][sub.id]) {
      const subContent = val.sub_values[0][sub.id];
      if (subContent.value !== undefined) {
        // eslint-disable-next-line prefer-destructuring
        value = subContent.value;
        unit = subContent.value_system;
        label = sub.col_name;
        match = '>=';
      } else {
        value = subContent;
        label = label === '' ? sub.col_name : label;
      }
      searchValues.push(
        [val.link, table, `${val.field.label.toLowerCase()}: ${label.toLowerCase()}`, match, value, unit].join(' ')
      );
    } else if (val.sub_values[0][sub.key]) {
      value = val.sub_values[0][sub.key];
      searchValues.push(
        [
          val.link, table, `${val.field.label.toLowerCase()}: ${sub.label.toLowerCase()}`, val.match, value, unit
        ].join(' ')
      );
    }
  });
  return searchValues;
};

const searchValuesByAvailableOptions = (val, table) => {
  const searchValues = [];
  let link = 'OR';
  let { match } = val;

  val.available_options.map((option, i) => {
    if (val.field.column.indexOf('temperature') === -1) {
      link = i === 0 ? 'OR' : 'AND';
      match = 'NOT LIKE';
    }
    if (!option.unit || option.unit.replace('°', '') !== val.unit.replace('°', '')) {
      searchValues.push([link, table, val.field.label.toLowerCase(), match, option.value, option.unit].join(' '));
    }
  });
  return searchValues;
};

const searchValuesByFilters = (store) => {
  const storedFilter = store.searchFilters;
  const filters = storedFilter.length === 0 ? [] : storedFilter[0].filters;
  const searchValues = [];

  if (store.searchResultVisible && filters.length > 0) {
    filters.map((val) => {
      const dateFields = ['date', 'datetime', 'time'].includes(val.field.type);
      let table = val.field.table || val.table;
      let value = dateFields ? new Date(val.value).toLocaleString('en-GB').split(', ').join(' ') : val.value;
      table = table.charAt(0).toUpperCase() + table.slice(1, -1).replace(/_/g, ' ');
      value = value && value !== true && !dateFields ? value.replace(/[\n\r]/g, ' OR ') : value;

      if (val.field.sub_fields && val.field.sub_fields.length >= 1 && val.sub_values.length >= 1) {
        const values = searchValuesBySubFields(val, table);
        searchValues.push(...values);
      } else if (val.field.table === 'device_descriptions' && val.field.opt !== undefined) {
        const label = `${val.field.column.toLowerCase()} ${val.field.label.toLowerCase()}`;
        searchValues.push([val.link, table, label, val.match, value, val.unit].join(' '));
      } else if (val.available_options?.length >= 1) {
        const values = searchValuesByAvailableOptions(val, table);
        searchValues.push([val.link, table, val.field.label.toLowerCase(), val.match, value, val.unit].join(' '));
        searchValues.push(...values);
      } else {
        searchValues.push([val.link, table, val.field.label.toLowerCase(), val.match, value, val.unit].join(' '));
      }
    });
  }
  store.changeSearchValues(searchValues);
};

const handleSearch = (store, uiState) => {
  const { currentCollection } = uiState;
  const collectionId = currentCollection ? currentCollection.id : null;
  const filters = filterSearchValues(store);
  const message = 'Please fill out all needed fields';
  store.addErrorMessage(message);
  console.log(filters);

  if (filters.length > 0 && store.errorMessages.length === 1) {
    store.showSearchResults();
    store.enableAccordionToggle();
    store.removeErrorMessage(message);

    const selection = {
      elementType: 'advanced',
      advanced_params: filters,
      search_by_method: 'advanced',
      page_size: uiState.number_of_results
    };

    store.loadSearchResults({
      selection,
      collectionId,
      moleculeSort: true,
    });
    // store.clearSearchAndTabResults();
    searchValuesByFilters(store);
  }
};

const AccordeonHeaderButtonForSearchForm = ({
  title, eventKey, disabled, callback
}) => {
  const { activeEventKey } = useContext(AccordionContext);
  const isCurrentEventKey = activeEventKey === eventKey;
  const activeClass = isCurrentEventKey ? 'active' : 'collapsed';

  const decoratedOnClick = useAccordionButton(eventKey, () => callback && callback(eventKey));

  return (
    <button
      type="button"
      className={`accordion-button ${activeClass}`}
      onClick={decoratedOnClick}
      disabled={disabled}
    >
      {title}
    </button>
  );
};

const SearchButtonToolbar = ({ store }) => (
  <ButtonToolbar className="advanced-search-buttons">
    <Button variant="secondary" id="advanced-cancel-button" onClick={() => store.handleCancel()}>
      Cancel
    </Button>
    <Button variant="danger" onClick={() => handleClear(store)}>
      Reset
    </Button>
    <Button
      variant="primary"
      id="advanced-search-button"
      onClick={() => handleSearch(store, UIStore.getState())}
    >
      Search
    </Button>
  </ButtonToolbar>
);

const panelVariables = (store) => {
  const variables = [
    {
      defaultClassName: 'collapsible-search-result',
      invisibleClassName: (store.search_result_panel_visible ? '' : ' inactive'),
      inactiveSearchClass: (!store.searchVisible ? 'inactive' : ''),
      inactiveResultClass: (!store.searchResultVisible ? 'inactive' : ''),
      searchTitle: (store.searchVisible ? 'Search' : 'Refine search'),
      resultTitle: (store.searchResultVisible ? 'Result' : 'Back to result'),
    }
  ];
  return variables[0];
};

export {
  togglePanel, handleClear, showErrorMessage, handleSearch,
  AccordeonHeaderButtonForSearchForm, SearchButtonToolbar, panelVariables
};
