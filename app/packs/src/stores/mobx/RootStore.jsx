import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { VesselDetailsStore } from 'src/stores/mobx/VesselDetailsStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    vesselDetailsStore: types.optional(VesselDetailsStore, {})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore },
    get vesselDetails() { return self.VesselDetailsStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
