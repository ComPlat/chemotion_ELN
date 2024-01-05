import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';
import { SearchStore } from 'src/stores/mobx/SearchStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    cellLineDetailsStore: types.optional(CellLineDetailsStore, {}),
    searchStore: types.optional(SearchStore, {})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore },
    get cellLineDetails() { return self.CellLineDetailsStore },
    get search() { return self.searchStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
