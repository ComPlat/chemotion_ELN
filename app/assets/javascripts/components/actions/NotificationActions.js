import alt from '../alt';

class NotificationActions {
  add(notification) {
    return notification;
  }

  remove(notification) {
    return notification;
  }

  removeByUid(uid) {
    return uid;
  }

  setComponentReference(input) {
    return input;
  }

  uploadErrorNotify(message) {
    return message;
  }
}

export default alt.createActions(NotificationActions);
