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

  notifyExImportStatus(type, status) {
    const params = {
      title: `Collection ${type}`,
      message: "The task has been submitted: this might take a while but you will be notified as soon as it is completed.",
      level: "info",
      dismissible: true,
      uid: "export_collection",
      position: "tr",
      autoDismiss: 5
    };

    switch(status) {
      case 204:
        break;
      case 401:
        params.message = `Unauthorized: you do not have the permission to ${type} this collection`;
        params.level = 'error';
        break;
      default:
        params.message = `An issue occured with your ${type} (status ${status}); please contact the administrators of the site if the problem persists.`;
        params.level = 'error';
    }
    return this.add(params);
  }
}

export default alt.createActions(NotificationActions);
