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
  sub_values: [],
  unit: ''
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
    search_results: types.map(SearchResult),
    tab_search_results: types.map(SearchResult),
    search_result_panel_visible: types.optional(types.boolean, false),
    search_results_visible: types.optional(types.boolean, false),
    search_visible: types.optional(types.boolean, true),
    search_filters: types.map(SearchFilter),
    search_values: types.optional(types.array(types.string), []),
    search_icon: types.optional(types.enumeration("search_icon", ["right", "down"]), "down"),
    result_icon: types.optional(types.enumeration("result_icon", ["right", "down"]), "right"),
    error_message: types.optional(types.string, ""),
    tab_current_page: types.optional(types.array(types.frozen({})), []),
    active_tab_key: types.optional(types.number, 0),
    show_search_result_list: types.optional(types.boolean, false),
  })
  .actions(self => ({
    // here we are using async actions (https://mobx-state-tree.js.org/concepts/async-actions) to use promises
    // within an action
    loadSearchResults: flow(function* loadSearchResults(params) {
      let result = yield SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params);
      self.search_results.clear();
      self.tab_search_results.clear();
      Object.entries(result).forEach(([key, value]) => {
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
      self.clearSearchResults();
      self.showMinimizedSearchModal();
    },
    changeSearchType(e) {
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.search_type = (e.target.checked == true ? 'detail' : 'advanced');
      self.active_tab_key = 0;
    },
    changeSearchElement(elementValues) {
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.search_element = elementValues;
      self.active_tab_key = 0;
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
    changeKetcherRailsValue(key, value) {
      let ketcherValues = { ...self.ketcher_rails_values };
      ketcherValues[key] = value;
      self.ketcher_rails_values = ketcherValues;
    },
    resetKetcherRailsValues() {
      self.ketcher_rails_values = defaultKetcherValues;
    },
    addSearchResult(key, result, ids) {
      let tabSearchResult = SearchResult.create({
        id: `${key}-${result.page || 1}`,
        results: {
          elements: result.elements,
          ids: ids.length > 0 ? ids : result.ids,
          page: result.page
        }
      })
      self.tab_search_results.set(tabSearchResult.id, tabSearchResult)
    },
    showSearchResults() {
      self.search_results_visible = true;
      self.search_result_panel_visible = true;
      self.search_visible = false;
      self.search_icon = "right";
      self.result_icon = "down";
    },
    hideSearchResults() {
      self.search_results_visible = false;
      self.search_result_panel_visible = false;
      self.search_visible = true;
      self.search_icon = "down";
      self.result_icon = "right";
    },
    toggleSearchResults() {
      self.search_results_visible = !self.search_results_visible;
      self.result_icon = self.search_results_visible ? "down" : "right";
      self.search_icon = self.result_icon == "right" ? "down" : "right";
    },
    clearSearchAndTabResults() {
      self.search_results.clear();
      self.tab_search_results.clear();
      self.clearTabCurrentPage();
    },
    clearSearchResults() {
      self.clearSearchAndTabResults();
      self.hideSearchResults();
      self.search_filters.clear();
      self.search_values.clear();
      self.changeErrorMessage('');
      self.clearTabCurrentPage();
      self.resetAdvancedSearchValue();
      self.detail_search_values = [];
      self.active_tab_key = 0;
      self.resetKetcherRailsValues();
    },
    toggleSearch() {
      self.search_visible = !self.search_visible;
      self.search_icon = self.search_visible ? "down" : "right";
      self.result_icon = self.search_icon == "right" ? "down" : "right";
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
    changeErrorMessage(message) {
      self.error_message = message
    },
    changeTabCurrentPage(key, index, id) {
      self.tab_current_page[id] = { [key]: index };
    },
    clearTabCurrentPage() {
      self.tab_current_page.splice(0, self.tab_current_page.length);
    },
    changeActiveTabKey(key) {
      self.active_tab_key = key;
    },
    handleCancel() {
      self.hideSearchModal();
      self.hideSearchResults();
      if (!self.show_search_result_list) {
        self.clearSearchResults();
      }
      self.active_tab_key = 0;
    },
    handleAdopt() {
      self.hideSearchModal();
      self.hideSearchResults();
      self.active_tab_key = 0;
      self.changeShowSearchResultListValue(true);
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
    get tabCurrentPage() { return values(self.tab_current_page) },
    get activeTabKey() { return self.active_tab_key },
  }));
