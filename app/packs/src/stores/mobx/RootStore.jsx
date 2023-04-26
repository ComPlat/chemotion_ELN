import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    cellLineDetailsStore: types.optional(CellLineDetailsStore, {})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore },
    get cellLineDetails() { return self.CellLineDetailsStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
