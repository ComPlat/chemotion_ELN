import alt from 'src/stores/alt/alt';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';


class NotificationStore {
  constructor() {
    this.state = {
      notificationSystem: null
    }

    this.bindListeners({
      handleAdd: NotificationActions.add,
      handleRemove: NotificationActions.remove,
      handleRemoveByUid: NotificationActions.removeByUid,
      handleNotificationImportSamplesFromFile: ElementActions.importSamplesFromFile,
      handleUploadErrorNotify: NotificationActions.uploadErrorNotify,
      handleSetComponentReference: NotificationActions.setComponentReference
    })
  }

  handleAdd(notification) {
    this.state.notificationSystem?.addNotification(notification);
  }

  handleRemove(notification) {
    this.state.notificationSystem?.removeNotification(notification);
  }

  handleRemoveByUid(uid) {
    this.state.notificationSystem?.removeNotification(uid);
  }

  handleClearNotifications() {
    this.state.notificationSystem?.clearNotifications();
  }

  handleNotificationImportSamplesFromFile(result) {
    const num = result.data?.length ?? 0;
    const { status, sdf, message } = result;
    this.handleRemoveByUid('import_samples_upload');
    let notification = {
      title: 'Oops!',
      message: `${message}\n Please check the file and try again.`,
      level: 'error',
      position: 'bl',
      autoDismiss: 0
    };
    if (sdf) {
      if (status === 'ok') {
        notification = {
          title: 'Success',
          message,
          level: 'success',
          position: 'bl',
          autoDismiss: 10
        };
      } else if (status === 'invalid') {
        notification.message = message;
      }
    } else if (status === 'ok') {
      notification = {
        title: 'Success',
        message: `The ${num} samples have been imported successfully`,
        level: 'success',
        position: 'bl',
        autoDismiss: 10
      };
    } else if (status === 'invalid') {
      notification.message = message;
    } else if (status === 'in progress') {
      notification.message = message;
      notification.title = 'Status';
      notification.level = 'success';
    } else if (status === 'warning') {
      notification = {
        title: 'Status',
        message: `The ${num} samples have been imported successfully but ${message}`,
        level: 'success',
        position: 'bl',
        autoDismiss: 10
      };
    }
    this.handleAdd(notification);
  }

  handleSetComponentReference(ref) {
    this.state.notificationSystem = ref;
  }

  handleUploadErrorNotify(message) {
    // this.handleRemoveByUid('import_samples_upload');
    this.handleClearNotifications();

    const notification = {
      title: 'Error',
      message,
      level: 'error',
      uid: 'import_reactions_upload',
      position: 'bl'
    };
    this.handleAdd(notification);
  }
}

export default alt.createStore(NotificationStore, 'NotificationStore');
