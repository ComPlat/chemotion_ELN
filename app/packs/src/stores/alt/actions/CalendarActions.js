/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';
import CalendarEntryFetcher from 'src/fetchers/CalendarEntryFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';

export const GET_ENTRIES_LOADING = 'getEntriesLoading';
export const UPDATE_ENTRY_LOADING = 'updateEntryLoading';
export const DELETE_ENTRY_LOADING = 'deleteEntryLoading';

function transformEntryForApi(entry) {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    kind: entry.kind,
    start_time: entry.start.toISOString(),
    end_time: entry.end.toISOString(),
    created_by: entry.created_by,
    eventable_type: entry.eventableType,
    eventable_id: entry.eventableId,
    notify_user_ids: entry.notifyUsers?.map((e) => e.value),
  };
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
    eventableType: entry.eventable_type,
    eventableId: entry.eventable_id,
    user_email: entry.user_email,
    user_name_abbreviation: entry.user_name_abbreviation,
    element_klass_icon: entry.element_klass_icon,
    element_klass_name: entry.element_klass_name,
    element_name: entry.element_name,
    accessible: entry.accessible,
    element_short_label: entry.element_short_label,
    notified_users: entry.notified_users,
  };
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
      eventableType: obj.eventableType,
      eventableId: obj.eventableId,
      with_shared_collections: obj.showSharedCollectionEntries
    });
    return obj;
  }

  getEventableUsers(collectionId) {
    return (dispatch) => {
      CalendarEntryFetcher.getEventableUsers(collectionId).then((users) => {
        dispatch(users);
      }).catch((err) => {
        dispatch(err);
      });
    };
  }

  clearEventableUsers() {
    return (dispatch) => { dispatch(null); };
  }

  getEntries(params) {
    this.startLoading(GET_ENTRIES_LOADING);
    const requestParams = {};
    requestParams.start_time = params.start.toISOString();
    requestParams.end_time = params.end.toISOString();
    requestParams.created_by = UserStore.getState().currentUser?.id;
    requestParams.eventable_type = params.eventableType;
    requestParams.eventable_id = params.eventableId;
    requestParams.with_shared_collections = params.with_shared_collections;

    return (dispatch) => {
      CalendarEntryFetcher.getEntries(requestParams).then((apiEntries) => {
        const entries = [];
        for (let i = 0; i < apiEntries.length; i += 1) {
          entries.push(transformEntryFromApi(apiEntries[i]));
        }

        dispatch(entries);
      }).catch((err) => {
        dispatch(err);
      });
    };
  }

  createEntry(entry) {
    this.startLoading(UPDATE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.create(transformEntryForApi(entry)).then((response) => {
        dispatch(transformEntryFromApi(response));
      }).catch((err) => {
        dispatch(err);
      });
    };
  }

  updateEntry(entry) {
    this.startLoading(UPDATE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.update(transformEntryForApi(entry)).then((response) => {
        dispatch(transformEntryFromApi(response));
      }).catch((err) => {
        dispatch(err);
      });
    };
  }

  deleteEntry(id) {
    this.startLoading(DELETE_ENTRY_LOADING);
    return (dispatch) => {
      CalendarEntryFetcher.deleteById(id).then((response) => {
        dispatch(transformEntryFromApi(response));
      }).catch((err) => {
        dispatch(err);
      });
    };
  }

  navigateToElement(eventableType, eventableId) {
    const type = eventableType.toLowerCase();

    const e = { type, params: {} };
    e.params[`${type}ID`] = eventableId;

    if (type === 'element') {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
  }
}

export default alt.createActions(CalendarActions);
