import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SearchFetcher from 'src/fetchers/SearchFetcher';

const SearchResult = types.model({
  id: types.maybeNull(types.string),
  results: types.maybeNull(types.frozen({}))
});

const SearchFilter = types.model({
  id: types.maybeNull(types.string),
  filters: types.maybeNull(types.frozen([]))
});

const advancedSearch = {
  value: 'advanced',
  label: 'Text Search'
}

const defaultSearchValues = [{
  link: '',
  match: '=',
  table: 'samples',
  element_id: 0,
  field: {
    column: 'name',
    label: 'Name',
  },
  value: '',
  smiles: '',
  sub_values: [],
  unit: '',
  available_options: [],
  validationState: null
}];

const defaultPublicationValues = [{
  link: '',
  match: '=',
  table: 'literatures',
  field: {
    column: 'doi',
    label: 'DOI',
  },
  value: '',
}];

const defaultKetcherValues = {
  queryMolfile: null,
  searchType: 'sub',
  tanimotoThreshold: 0.7 
};

const searchElementValues = {
  table: 'samples',
  element_id: 0,
  element_table: 'samples'
}

export const SearchStore = types
  .model({
    search_modal_visible: types.optional(types.boolean, false),
    search_modal_minimized: types.optional(types.boolean, false),
    search_modal_selected_form: types.optional(types.frozen({}), advancedSearch),
    search_type: types.optional(types.string, "advanced"),
    search_element: types.optional(types.frozen({}), searchElementValues),
    advanced_search_values: types.optional(types.array(types.frozen({})), defaultSearchValues),
    detail_search_values: types.optional(types.array(types.frozen({})), []),
    ketcher_rails_values: types.optional(types.frozen({}), defaultKetcherValues),
    publication_search_values: types.optional(types.array(types.frozen({})), defaultPublicationValues),
    numeric_match: types.optional(types.string, '>='),
    search_results: types.map(SearchResult),
    tab_search_results: types.map(SearchResult),
    search_accordion_active_key: types.optional(types.number, 0),
    search_result_panel_visible: types.optional(types.boolean, false),
    search_results_visible: types.optional(types.boolean, false),
    search_result_active_tab_key: types.optional(types.number, 1),
    search_accordion_toggle_disabled: types.optional(types.boolean, true),
    search_visible: types.optional(types.boolean, true),
    search_filters: types.map(SearchFilter),
    search_values: types.optional(types.array(types.string), []),
    error_messages: types.optional(types.array(types.string), []),
    tab_current_page: types.optional(types.array(types.frozen({})), []),
    active_tab_key: types.optional(types.number, 0),
    show_search_result_list: types.optional(types.boolean, false),
    result_error_messages: types.optional(types.array(types.string), []),
  })
  .actions(self => ({
    // here we are using async actions (https://mobx-state-tree.js.org/concepts/async-actions) to use promises
    // within an action
    loadSearchResults: flow(function* loadSearchResults(params) {
      let result = yield SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params);
      if (result) {
        self.search_results.clear();
        self.tab_search_results.clear();
        Object.entries(result).forEach(([key, value]) => {
          let errorExists = self.result_error_messages.find((e) => { return e == value.error });
          if (value.error !== undefined && value.error !== '' && errorExists === undefined) {
            self.result_error_messages.push(value.error);
          }
          let searchResult = SearchResult.create({
            id: key,
            results: {
              ids: value.ids,
              page: value.page,
              pages: value.pages,
              per_page: value.perPage,
              total_elements: value.totalElements
            }
          })
          self.search_results.set(searchResult.id, searchResult)
          self.addSearchResult(key, value, value.ids.slice(0, 15))
        });
      }
    }),
    loadSearchResultTab: flow(function* loadSearchResultTab(params) {
      let result = yield SearchFetcher.fetchBasedOnSearchResultIds(params);
      Object.entries(result).forEach(([key, value]) => {
        self.addSearchResult(key, value, [])
      });
    }),
    showSearchModal() {
      self.search_modal_visible = true;
    },
    hideSearchModal() {
      self.search_modal_visible = false;
    },
    showMinimizedSearchModal() {
      self.search_modal_minimized = false;
    },
    toggleSearchModalMinimized() {
      self.search_modal_minimized = !self.search_modal_minimized;
    },
    changeSearchModalSelectedForm(value) {
      self.search_modal_selected_form = value;
      if (!self.searchVisible) {
        self.toggleSearch();
        self.toggleSearchResults();
      }
      // self.clearSearchResults();
      self.showMinimizedSearchModal();
    },
    changeSearchType(e) {
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.resetPublicationSearchValue();
      self.search_type = (e.target.checked == true ? 'detail' : 'advanced');
      self.active_tab_key = 0;
      self.search_result_active_tab_key = 1;
    },
    changeSearchElement(elementValues) {
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.resetPublicationSearchValue();
      self.search_element = elementValues;
      self.active_tab_key = 0;
      self.search_result_active_tab_key = 1;
    },
    addAdvancedSearchValue(id, values) {
      self.advanced_search_values[id] = values;
    },
    resetAdvancedSearchValue() {
      self.advanced_search_values = defaultSearchValues;
    },
    addDetailSearchValue(key, values) {
      let index = self.detail_search_values.findIndex((x) => { return Object.keys(x).indexOf(key) != -1 })
      if (index != -1) {
        self.detail_search_values[index] = { [key]: values };
      } else {
        self.detail_search_values.push({ [key]: values });
      }
    },
    removeDetailSearchValue(key) {
      let index = self.detail_search_values.findIndex((x) => { return Object.keys(x).indexOf(key) != -1 })
      if (index != -1) {
        self.detail_search_values.splice(index, 1);
      }
    },
    changeNumericMatchValue(match) {
      self.numeric_match = match;
      self.detail_search_values.map((object, i) => {
        if (['>=', '<='].includes(Object.values(object)[0].match)) {
          Object.entries(self.detail_search_values[i]).forEach(([key, value]) => {
            let values = { ...value };
            values.match = match;
            self.detail_search_values[i] = { [key]: values };
          });
        }
      });
    },
    changeKetcherRailsValue(key, value) {
      let ketcherValues = { ...self.ketcher_rails_values };
      ketcherValues[key] = value;
      self.ketcher_rails_values = ketcherValues;
    },
    resetKetcherRailsValues() {
      self.ketcher_rails_values = defaultKetcherValues;
    },
    addPublicationSearchValue(id, values) {
      self.publication_search_values[id] = values;
    },
    resetPublicationSearchValue() {
      self.publication_search_values = defaultPublicationValues;
    },
    addSearchResult(key, result, ids) {
      let tabSearchResult = SearchResult.create({
        id: `${key}-${result.page || 1}`,
        results: {
          elements: result.elements,
          ids: ids.length > 0 ? ids : result.ids,
          page: result.page
        }
      });
      self.tab_search_results.set(tabSearchResult.id, tabSearchResult)
    },
    showSearchResults() {
      self.search_results_visible = true;
      self.search_result_panel_visible = true;
      self.search_visible = false;
      self.search_accordion_active_key = 1;
    },
    hideSearchResults() {
      self.search_results_visible = false;
      self.search_result_panel_visible = false;
      self.search_visible = true;
      self.search_accordion_active_key = 0;
    },
    toggleSearchResults() {
      self.search_results_visible = !self.search_results_visible;
      self.search_accordion_active_key = self.search_results_visible ? 1 : 0;
    },
    clearSearchAndTabResults() {
      self.search_results.clear();
      self.tab_search_results.clear();
      self.clearTabCurrentPage();
    },
    clearSearchResults() {
      self.clearSearchAndTabResults();
      self.hideSearchResults();
      self.search_result_panel_visible = false;
      self.search_accordion_active_key = 0;
      self.search_filters.clear();
      self.search_values.clear();
      self.error_messages = [];
      self.clearTabCurrentPage();
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.active_tab_key = 0;
      self.search_result_active_tab_key = 1;
      self.resetKetcherRailsValues();
      self.resetPublicationSearchValue();
      self.result_error_messages = [];
    },
    toggleSearch() {
      self.search_visible = !self.search_visible;
    },
    enableAccordionToggle() {
      self.search_accordion_toggle_disabled = false;
    },
    changeSearchFilter(filtered_options) {
      let filter = SearchFilter.create({ id: 'filter', filters: filtered_options });
      self.search_filters.clear();
      self.search_filters.set(filter.id, filter);
    },
    changeSearchValues(values) {
      self.search_values.clear();
      self.search_values = values;
    },
    addErrorMessage(message) {
      if (!self.error_messages.includes(message)) {
        self.error_messages.push(message);
      }
    },
    removeErrorMessage(message) {
      let neededFieldsMessage = 'Please fill out all needed fields';
      if (message === undefined) {
        self.error_messages = [];
      } else {
        let error_messages = self.error_messages.filter((m) => { return m != message && m != neededFieldsMessage });
        self.error_messages = error_messages;
      }
    },
    changeTabCurrentPage(key, index, id) {
      const tabs = [...self.tab_current_page];
      tabs[id] = { [key]: index };
      self.tab_current_page = tabs;
    },
    clearTabCurrentPage() {
      self.tab_current_page.splice(0, self.tab_current_page.length);
    },
    changeActiveTabKey(key) {
      self.active_tab_key = key;
    },
    changeSearchResultActiveTabKey(key) {
      self.search_result_active_tab_key = key;
    },
    handleCancel() {
      self.hideSearchModal();
      self.hideSearchResults();
      if (!self.show_search_result_list) {
        self.clearSearchResults();
      } else {
        self.search_result_panel_visible = true;
      }
      self.active_tab_key = 0;
      self.result_error_messages = [];
    },
    handleAdopt() {
      self.hideSearchModal();
      self.hideSearchResults();
      self.active_tab_key = 0;
      self.search_result_active_tab_key = 1;
      self.search_result_panel_visible = true;
      self.changeShowSearchResultListValue(true);
      self.result_error_messages = [];
    },
    changeShowSearchResultListValue(value) {
      self.show_search_result_list = value;
      if (!value) {
        self.clearSearchResults();
      }
    }
  }))
  .views(self => ({
    get searchModalVisible() { return self.search_modal_visible },
    get searchModalMinimized() { return self.search_modal_minimized },
    get searchModalSelectedForm() { return self.search_modal_selected_form },
    get searchResultsCount() { return keys(self.search_results).length },
    get searchResultValues() { return values(self.search_results) },
    get tabSearchResultValues() { return values(self.tab_search_results) },
    get searchResultVisible() { return self.search_results_visible },
    get searchVisible() { return self.search_visible },
    get searchFilters() { return values(self.search_filters) },
    get searchValues() { return values(self.search_values) },
    get searchType() { return self.search_type },
    get searchElement() { return self.search_element },
    get advancedSearchValues() { return values(self.advanced_search_values) },
    get detailSearchValues() { return values(self.detail_search_values) },
    get ketcherRailsValues() { return self.ketcher_rails_values },
    get publicationSearchValues() { return values(self.publication_search_values) },
    get tabCurrentPage() { return values(self.tab_current_page) },
    get activeTabKey() { return self.active_tab_key },
    get errorMessages() { return values(self.error_messages) },
    get resultErrorMessage() { return values(self.result_error_messages) },
  }));
