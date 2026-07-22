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
import { CollectionsStore } from 'src/stores/mobx/CollectionsStore';
import { NotificationsStore } from 'src/stores/mobx/NotificationsStore';
import UserStore from 'src/stores/mobx/UserStore';

const RootStore = types
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
    collectionsStore: types.optional(CollectionsStore, {}),
    notificationsStore: types.optional(NotificationsStore, {}),
    userStore: types.optional(UserStore, {})
  })
  .actions((self) => ({
    reset: () => {
      self.userStore.logout();
      self.measurementsStore = MeasurementsStore.create({ measurements: {}, sampleHeaders: {} });
      self.sampleTasksStore = SampleTasksStore.create({});
      self.cellLineDetailsStore = CellLineDetailsStore.create({});
      self.vesselDetailsStore = VesselDetailsStore.create({});
      self.searchStore = SearchStore.create({});
      self.devicesStore = DevicesStore.create({});
      self.deviceMetadataStore = DeviceMetadataStore.create({});
      self.attachmentNotificationStore = AttachmentNotificationStore.create({});
      self.calendarStore = CalendarStore.create({});
      self.deviceDescriptionsStore = DeviceDescriptionsStore.create({});
      self.sequenceBasedMacromoleculeSamplesStore = SequenceBasedMacromoleculeSamplesStore.create({});
      self.collectionsStore = CollectionsStore.create({});
      self.userStore = UserStore.create({});
    }
  }))
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
    get deviceDescriptions() { return self.deviceDescriptionsStore; },
    get sequenceBasedMacromoleculeSamples() { return self.sequenceBasedMacromoleculeSamplesStore; },
    get collections() { return self.collectionsStore; },
    get notifications() { return self.notificationsStore; },
    get user() { return self.userStore; },
  }));
export const rootStore = RootStore.create({});
export const StoreContext = React.createContext(rootStore);
