import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from './MeasurementsStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} })
  })
  .views(self => ({
    get measurements() { return self.measurementsStore }
  }));
export const StoreContext = React.createContext(RootStore.create({}));
