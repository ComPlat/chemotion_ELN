import alt from 'src/stores/alt/alt';
import CalendarActions, {
  GET_ENTRIES_LOADING,
  UPDATE_ENTRY_LOADING,
  DELETE_ENTRY_LOADING,
} from 'src/stores/alt/actions/CalendarActions';

export const CalendarTypes = {
  default: [
    'reservation', 'duration', 'handover', 'reminder', 'report', 'meeting', 'maintenance', 'availability'
  ],
  Reaction: ['reminder', 'report'],
  Sample: ['handover', 'reminder', 'report'],
  ResearchPlan: ['handover', 'reminder', 'report'],
  Screen: ['reminder', 'report'],
  // Element all types like default
};

class CalendarStore {
  constructor() {
    this.state = {
      error: null,
      [GET_ENTRIES_LOADING]: false,
      [UPDATE_ENTRY_LOADING]: false,
      [DELETE_ENTRY_LOADING]: false,
      show: false,
      showSharedCollectionEntries: false,
      entries: [],
      collectionUsers: []
    };

    this.bindListeners({
      getEntries: CalendarActions.getEntries,
      getEventableUsers: CalendarActions.getEventableUsers,
      clearEventableUsers: CalendarActions.clearEventableUsers,
      handleShow: CalendarActions.showCalendar,
      handleHide: CalendarActions.hideCalendar,
      updateEntry: [CalendarActions.createEntry, CalendarActions.updateEntry],
      deleteEntry: CalendarActions.deleteEntry,
      handleLoading: CalendarActions.startLoading,
      setViewParams: CalendarActions.setViewParams
    });
  }

  getEntries(event) {
    if (typeof event === 'string') {
      this.setState({
        [GET_ENTRIES_LOADING]: false,
        entries: [],
        error: event
      });
    } else {
      this.setState({
        [GET_ENTRIES_LOADING]: false,
        entries: event,
        error: ''
      });
    }
  }

  getEventableUsers(users) {
    this.setState({
      collectionUsers: users,
    });
  }

  clearEventableUsers() {
    this.setState({
      collectionUsers: [],
    });
  }

  setViewParams(obj) {
    this.setState(obj);
  }

  handleLoading(key) {
    this.setState({ [key]: true });
  }

  handleShow() {
    this.setState({ show: true });
  }

  handleHide() {
    this.setState({ show: false });
  }

  deleteEntry(event) {
    if (typeof event === 'string') {
      this.setState({
        [DELETE_ENTRY_LOADING]: false,
        error: event
      });
    } else {
      const { entries } = this.state;
      for (let i = 0; i < entries.length; i += 1) {
        if (entries[i].id === event.id) {
          entries.splice(i, 1);
          break;
        }
      }
      this.setState({
        [DELETE_ENTRY_LOADING]: false,
        entries,
        error: ''
      });
    }
  }

  updateEntry(event) {
    if (typeof event === 'string') {
      this.setState({
        [UPDATE_ENTRY_LOADING]: false,
        error: event
      });
    } else {
      const { entries } = this.state;
      let isUpdate = false;
      for (let i = 0; i < entries.length; i += 1) {
        if (entries[i].id === event.id) {
          entries[i] = event;
          isUpdate = true;
          break;
        }
      }
      if (!isUpdate) {
        entries.push(event);
      }

      this.setState({
        [UPDATE_ENTRY_LOADING]: false,
        entries,
        error: ''
      });
    }
  }
}

export default alt.createStore(CalendarStore, 'CalendarStore');
