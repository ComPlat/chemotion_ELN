import alt from 'src/stores/alt/alt';
import CalendarEntryFetcher from 'src/fetchers/CalendarEntryFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';

export const GET_ENTRIES_LOADING = "getEntriesLoading";
export const UPDATE_ENTRY_LOADING = "updateEntryLoading";
export const DELETE_ENTRY_LOADING = "deleteEntryLoading";

function transformEntryForApi(entry) {
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
    notify_user_ids: entry.notifyUsers?.map(e => e.value),
  }
}

function transformEntryFromApi(entry) {
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
}

class CalendarActions {
  startLoading(val) {
    return val;
  }

  showCalendar(params) {
    this.setViewParams(params);
    return null;
  }

  hideCalendar() {
    return null;
  }

  setViewParams(obj) {
    this.getEntries({
      start: obj.start,
      end: obj.end,
      eventable_type: obj.eventable_type,
      eventable_id: obj.eventable_id,
      with_shared_collections: obj.showSharedCollectionEntries
    });
    return obj;
  }

  getEventableUsers(collectionId) {
    return (dispatch) => {
      CalendarEntryFetcher.getEventableUsers(collectionId).then(users => {
        dispatch(users);
      }).catch(err => {
        dispatch(err);
      });
    };
  }

  clearEventableUsers() {
    return (dispatch) => {dispatch(null)};
  }

  getEntries(params) {
    this.startLoading(GET_ENTRIES_LOADING);
    let requestParams = {};
    requestParams.start_time = params.start.toISOString();
    requestParams.end_time = params.end.toISOString();
    requestParams.created_by = UserStore.getState().currentUser?.id;
    requestParams.eventable_type = params.eventable_type;
    requestParams.eventable_id = params.eventable_id;
    requestParams.with_shared_collections = params.with_shared_collections;

    return (dispatch) => {
      CalendarEntryFetcher.getEntries(requestParams).then(apiEntries => {
        let entries = [];
        for(let i=0; i<apiEntries.length; i++) {
          entries.push(transformEntryFromApi(apiEntries[i]));
        }
        dispatch(entries);
      }).catch(err => {
        dispatch(err);
      });
    };
  }

  createEntry(entry) {
    this.startLoading(UPDATE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.create(transformEntryForApi(entry)).then(entry => {
        dispatch(transformEntryFromApi(entry));
      }).catch(err => {
        dispatch(err);
      });
    };
  }

  updateEntry(entry) {
    this.startLoading(UPDATE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.update(transformEntryForApi(entry)).then(entry => {
        dispatch(transformEntryFromApi(entry));
      }).catch(err => {
        dispatch(err);
      });
    };
  }

  deleteEntry(id) {
    this.startLoading(DELETE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.deleteById(id).then(entry => {
        dispatch(transformEntryFromApi(entry));
      }).catch(err => {
        dispatch(err);
      });
    };
  }

  navigateToElement(eventable_type, eventable_id) {
    eventable_type = eventable_type.toLowerCase();

    const e = { type: eventable_type, params: {} };
    e.params[`${eventable_type}ID`] = eventable_id;

    if (eventable_type == "element") {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e)
  }
}

export default alt.createActions(CalendarActions);
