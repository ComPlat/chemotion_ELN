import { keys, values } from 'mobx';
import { flow, types, getSnapshot } from 'mobx-state-tree';

import SearchFetcher from 'src/fetchers/SearchFetcher';

const SearchResult = types.model({
  id: types.maybeNull(types.string),
  results: types.maybeNull(types.frozen({}))
});

const SearchFilter = types.model({
  id: types.maybeNull(types.string),
  filters: types.maybeNull(types.frozen([]))
});

export const SearchResultsStore = types
  .model({
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
    tab_current_page: types.optional(types.array(types.frozen({})), [])
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
      console.log(getSnapshot(self.search_results))
    }),
    loadSearchResultTab: flow(function* loadSearchResultTab(params) {
      let result = yield SearchFetcher.fetchBasedOnSearchResultIds(params);
      Object.entries(result).forEach(([key, value]) => {
        self.addSearchResult(key, value, [])
      });
      console.log('tabs', getSnapshot(self.tab_search_results))
    }),
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
    clearSearchAndTabResults () {
      self.search_results.clear();
      self.tab_search_results.clear();
    },
    clearSearchResults() {
      self.clearSearchAndTabResults();
      self.hideSearchResults();
      self.search_filters.clear();
      self.search_values.clear();
      self.changeErrorMessage('');
      self.clearTabCurrentPage();
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
      console.log(getSnapshot(self.search_filters));
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
    }
  }))
  .views(self => ({
    get searchResultsCount() { return keys(self.search_results).length },
    get searchResultValues() { return values(self.search_results) },
    get tabSearchResultValues() { return values(self.tab_search_results) },
    get searchResultVisible() { return self.search_results_visible },
    get searchVisible() { return self.search_visible },
    get searchFilters() { return values(self.search_filters) },
    get searchValues() { return values(self.search_values) }
  }));
