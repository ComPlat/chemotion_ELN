import React from 'react';
import { types } from 'mobx-state-tree';
import { MeasurementsStore } from 'src/stores/mobx/MeasurementsStore';
import { SampleTasksStore } from 'src/stores/mobx/SampleTasksStore';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';
import { SearchStore } from 'src/stores/mobx/SearchStore';
import { DevicesStore } from 'src/stores/mobx/DevicesStore';
import { DeviceMetadataStore } from 'src/stores/mobx/DeviceMetadataStore';
import { AttachmentNotificationStore } from 'src/stores/mobx/AttachmentNotificationStore';
import { CalendarStore } from 'src/stores/mobx/CalendarStore';
import { DeviceDescriptionsStore } from 'src/stores/mobx/DeviceDescriptionsStore';
import { VesselDetailsStore } from 'src/stores/mobx/VesselDetailsStore';
import { SequenceBasedMacromoleculeSamplesStore } from 'src/stores/mobx/SequenceBasedMacromoleculeSamplesStore';

export const RootStore = types
  .model({
    measurementsStore: types.optional(MeasurementsStore, { measurements: {}, sampleHeaders: {} }),
    sampleTasksStore: types.optional(SampleTasksStore, {}),
    cellLineDetailsStore: types.optional(CellLineDetailsStore, {}),
    vesselDetailsStore: types.optional(VesselDetailsStore, {}),
    searchStore: types.optional(SearchStore, {}),
    devicesStore: types.optional(DevicesStore, {}),
    deviceMetadataStore: types.optional(DeviceMetadataStore, {}),
    attachmentNotificationStore: types.optional(AttachmentNotificationStore, {}),
    calendarStore: types.optional(CalendarStore, {}),
    deviceDescriptionsStore: types.optional(DeviceDescriptionsStore, {}),
    sequenceBasedMacromoleculeSamplesStore: types.optional(SequenceBasedMacromoleculeSamplesStore, {}),
  })
  .views((self) => ({
    get measurements() { return self.measurementsStore; },
    get sampleTasks() { return self.sampleTasksStore; },
    get cellLineDetails() { return self.CellLineDetailsStore; },
    get vesselDetails() { return self.VesselDetailsStore; },
    get search() { return self.searchStore; },
    get devices() { return self.devicesStore; },
    get deviceMetadata() { return self.deviceMetadataStore; },
    get attachmentNotifications() { return self.attachmentNotificationStore; },
    get calendar() { return self.calendarStore; },
    get deviceDescriptions() { return self.deviceDescriptionsStore },
    get sequenceBasedMacromoleculeSamples() { return self.sequenceBasedMacromoleculeSamplesStore },
  }));
export const StoreContext = React.createContext(RootStore.create({}));
