import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { SearchResultsStore } from 'src/stores/mobx/SearchResultsStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    searchResultsStore: types.optional(SearchResultsStore, {})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore },
    get searchResults() { return self.searchResultsStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
