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
    search_result_panel_visible: types.optional(types.boolean, false),
    search_results_visible: types.optional(types.boolean, false),
    search_visible: types.optional(types.boolean, true),
    search_filters: types.map(SearchFilter),
    search_icon: types.optional(types.enumeration("search_icon", ["right", "down"]), "down"),
    result_icon: types.optional(types.enumeration("result_icon", ["right", "down"]), "right"),
    error_message: types.optional(types.string, "")
  })
  .actions(self => ({
    // here we are using async actions (https://mobx-state-tree.js.org/concepts/async-actions) to use promises
    // within an action
    loadSearchResults: flow(function* loadSearchResults(params) {
      let result = yield SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params);
      self.search_results.clear();
      Object.entries(result).forEach(([key, value]) => {
        let searchResult = SearchResult.create({
          id: key,
          results: {
            elements: value['elements'],
            ids: value['ids'],
            page: value['page'],
            per_page: value['perPage'],
            total_elements: value['totalElements']
          }
        })
        self.search_results.set(searchResult.id, searchResult)
      });
      console.log(getSnapshot(self.search_results))
    }),
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
    clearSearchResults() {
      self.search_results.clear();
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
    clearFilter() {
      self.search_filters.clear();
    },
    changeErrorMessage(message) {
      self.error_message = message
    }
  }))
  .views(self => ({
    get searchResultsCount() { return keys(self.search_results).length },
    get searchResultValues() { return values(self.search_results) },
    get searchResultVisible() { return self.search_results_visible },
    get searchVisible() { return self.search_visible },
    get searchFilters() { return values(self.search_filters) }
  }));
