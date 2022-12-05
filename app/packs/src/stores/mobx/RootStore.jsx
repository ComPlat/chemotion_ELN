import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
