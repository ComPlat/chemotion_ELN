import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';
import CalendarEntryFetcher from 'src/fetchers/CalendarEntryFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';

const CalendarTypes = {
  default: [
    'reservation', 'duration', 'handover', 'reminder', 'report', 'meeting', 'maintenance', 'availability'
  ],
  Reaction: ['reminder', 'report'],
  Sample: ['handover', 'reminder', 'report'],
  ResearchPlan: ['handover', 'reminder', 'report'],
  Screen: ['reminder', 'report'],
  DeviceDescription: ['reminder', 'report'],
  SequenceBasedMacromoleculeSample: ['reminder', 'report'],
  // Element all types like default
};

const defaultDeltaPosition = { x: 0, y: 0 };

export const CalendarStore = types
  .model({
    delta_position: types.optional(types.frozen({}), defaultDeltaPosition),
    delta_position_editor: types.optional(types.frozen({}), defaultDeltaPosition),
    show_calendar: types.optional(types.boolean, false),
    show_time_slot_editor: types.optional(types.boolean, false),
    modal_dimension: types.optional(types.frozen({}), { width: 1140, height: 620 }),
    editor_dimension: types.optional(types.frozen({}), { width: 500, height: 780 }),

    backdrop: types.optional(types.boolean, true),
    editor_backdrop: types.optional(types.boolean, true),
    fullscreen: types.optional(types.boolean, false),
    current_entry: types.optional(types.frozen({}), {}),
    current_entry_editable: types.optional(types.boolean, false),
    show_own_entries: types.optional(types.boolean, false),
    current_view: types.optional(types.string, 'week'),
    show_detail: types.optional(types.boolean, false),

    collection_users: types.optional(types.array(types.frozen({})), []),
    calendar_types: types.optional(types.frozen({}), CalendarTypes),
    start: types.optional(types.maybeNull(types.Date)),
    end: types.optional(types.maybeNull(types.Date)),
    entries: types.optional(types.array(types.frozen({})), []),
    eventable_id: types.optional(types.maybeNull(types.number)),
    eventable_type: types.optional(types.maybeNull(types.string)),
    showSharedCollectionEntries: types.optional(types.boolean, false),
  })
  .actions(self => ({
    getEntries: flow(function* getEntries() {
      const params = {
        start_time: self.start.toISOString(),
        end_time: self.end.toISOString(),
        created_by: UserStore.getState().currentUser?.id,
        eventable_type: self.eventable_type,
        eventable_id: self.eventable_id,
        with_shared_collections: self.show_shared_collection_entries
      };

      let result = yield CalendarEntryFetcher.getEntries(params);
      if (result) {
        if (self.entries.length >= 1) { self.entries = []; }
        result.forEach(entry => self.entries.push(self.transformEntryFromApi(entry)));
      }
    }),
    getCollectionUsers: flow(function* getCollectionUsers(params) {
      let result = yield CalendarEntryFetcher.getEventableUsers(params);
      if (result) {
        self.collection_users = result;
      }
    }),
    createEntry: flow(function* createEntry(entry) {
      let result = yield CalendarEntryFetcher.create(self.transformEntryForApi(entry));
      if (result) {
        if (result.error) {
          console.log(result);
        } else {
          self.entries.push(self.transformEntryFromApi(result));
          self.getEntries();
        }
      }
    }),
    updateEntry: flow(function* updateEntry(entry) {
      let result = yield CalendarEntryFetcher.update(self.transformEntryForApi(entry));
      if (result) {
        if (result.error) {
          console.log(result);
        } else {
          const index = self.entries.findIndex(entry => entry.id === result.id);
          let entries = [...self.entries];
          if (index !== -1) {
            entries[index] = self.transformEntryFromApi(result);
          } else {
            self.entries.push(self.transformEntryFromApi(result));
          }
          self.getEntries();
        }
      }
    }),
    deleteEntry: flow(function* deleteEntry(entry_id) {
      let result = yield CalendarEntryFetcher.deleteById(entry_id);
      if (result) {
        if (result.error) {
          console.log(result);
        } else {
          const index = self.entries.findIndex(entry => entry.id === result.id);
          if (index !== -1) {
            self.entries.splice(index, 1);
          }
          self.getEntries();
        }
      }
    }),
    showCalendar() {
      self.show_calendar = true;
    },
    closeCalendar() {
      self.current_entry = {};
      self.show_time_slot_editor = false;
      self.show_calendar = false;
    },
    toggleBackdrop(event) {
      event.stopPropagation();
      event.preventDefault();
      self.backdrop = !self.backdrop;
    },
    toggleFullScreen(event) {
      event.stopPropagation();
      event.preventDefault();
      self.fullscreen = !self.fullscreen;
      self.show_detail = false;
    },
    changeDeltaPosition(position) {
      self.delta_position = position;
    },
    changeDeltaPositionEditor(position) {
      self.delta_position_editor = position;
    },
    changeModalDimension(dimension) {
      self.modal_dimension = dimension;
    },
    changeEditorDimension(dimension) {
      self.editor_dimension = dimension;
    },
    changeCurrentView(view) {
      self.current_view = view;
    },
    openElement() {
      self.changeDeltaPosition(defaultDeltaPosition);
      self.backdrop = false;
      self.editor_backdrop = false;
      self.show_detail = true;
    },
    navigateToElement(entry) {
      const eventable_type = entry.eventable_type.toLowerCase();

      const e = { type: eventable_type, params: {} };
      e.params[`${eventable_type}ID`] = entry.eventable_id;
      if (/\blabimotion\b/.test(eventable_type)) {
        e.klassType = 'GenericEl';
      }
      elementShowOrNew(e);
    },
    getOrClearCollectionUsers(eventable_type, eventable_id) {
      if (eventable_type) {
        self.getCollectionUsers({
          eventable_type: eventable_type,
          eventable_id: eventable_id
        });
      } else {
        self.collection_users = [];
      }
    },
    changeCurrentEntry(key, value) {
      let currentEntry = { ...self.current_entry };
      currentEntry[key] = value;
      self.current_entry = currentEntry;
    },
    buildNewEntry(entry) {
      return {
        ...entry,
        title: '',
        description: '',
        kind: '',
        eventable_id: self.eventable_id,
        eventable_type: self.eventable_type,
        accessible: true,
      };
    },
    canEditEntry(entry) {
      return !entry.created_by || entry.created_by === UserStore.getState().currentUser?.id;
    },
    setEditorValues(entry) {
      self.current_entry = entry;
      self.show_time_slot_editor = true;
      self.current_entry_editable = self.canEditEntry(entry);
    },
    resetEditorValues() {
      self.current_entry = {};
      self.show_time_slot_editor = false;
      self.current_entry_editable = false;
    },
    toggleEntries(event) {
      event.stopPropagation();
      event.preventDefault();
      if (self.eventable_type) {
        self.show_own_entries = !self.show_own_entries;
      } else {
        self.show_shared_collection_entries = !self.show_shared_collection_entries;
        self.getEntries();
      }
    },
    onRangeChange(range, view) {
      let newRange = range;

      if (Array.isArray(range)) {
        const lastDate = range[range.length - 1];
        newRange = {
          start: range[0],
          end: new Date((new Date(lastDate)).setDate(lastDate.getDate() + 1))
        };
      }

      if (view) {
        self.changeCurrentView(view);
      }

      if (self.start <= newRange.start && self.end >= newRange.end) { return; }

      self.start = newRange.start;
      self.end = newRange.end;
      self.getEntries();
    },
    setViewParams(object) {
      self.start = object.start;
      self.end = object.end;
      self.eventable_id = object.eventable_id;
      self.eventable_type = object.eventable_type;
      self.show_shared_collection_entries = object.showSharedCollectionEntries;

      self.getEntries();
    },
    transformEntryFromApi(entry) {
      return {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        kind: entry.kind,
        start: new Date(entry.start_time),
        end: new Date(entry.end_time),
        created_by: entry.created_by,
        eventable_type: entry.eventable_type,
        eventable_id: entry.eventable_id,
        user_email: entry.user_email,
        user_name_abbreviation: entry.user_name_abbreviation,
        element_klass_icon: entry.element_klass_icon,
        element_klass_name: entry.element_klass_name,
        element_name: entry.element_name,
        accessible: entry.accessible,
        element_short_label: entry.element_short_label,
        notified_users: entry.notified_users,
      }
    },
    transformEntryForApi(entry) {
      return {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        kind: entry.kind,
        start_time: entry.start.toISOString(),
        end_time: entry.end.toISOString(),
        created_by: entry.created_by,
        eventable_type: entry.eventable_type,
        eventable_id: entry.eventable_id,
        notify_user_ids: entry.notify_users?.map((e) => e.value),
      }
    },
  }))
  .views(self => ({
    get calendarEntries() { return values(self.entries) },
    get collectionUsers() { return values(self.collection_users) },
  }));
