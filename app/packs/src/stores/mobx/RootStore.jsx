import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';
import { SearchStore } from 'src/stores/mobx/SearchStore';
import { DevicesStore } from 'src/stores/mobx/DevicesStore';
import { DeviceMetadataStore } from 'src/stores/mobx/DeviceMetadataStore';
import { AttachmentNotificationStore } from 'src/stores/mobx/AttachmentNotificationStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    cellLineDetailsStore: types.optional(CellLineDetailsStore, {}),
    searchStore: types.optional(SearchStore, {}),
    devicesStore: types.optional(DevicesStore, {}),
    deviceMetadataStore: types.optional(DeviceMetadataStore, {}),
    attachmentNotificationStore: types.optional(AttachmentNotificationStore,{})
  })
  .views(self => ({
    get measurements() { return self.measurementsStore },
    get sampleTasks() { return self.sampleTasksStore },
    get cellLineDetails() { return self.CellLineDetailsStore },
    get search() { return self.searchStore },
    get devices() { return self.devicesStore },
    get deviceMetadata() { return self.deviceMetadataStore },
    get attachmentNotifications() { return self.attachmentNotificationStore },
  }));
export const StoreContext = React.createContext(RootStore.create({}));
