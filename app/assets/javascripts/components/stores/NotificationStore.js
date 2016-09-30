import alt from '../alt';
import NotificationActions from '../actions/NotificationActions';
import ElementActions from '../actions/ElementActions';


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
      handleSetComponentReference: NotificationActions.setComponentReference
    })
  }

  handleAdd(notification) {
    this.state.notificationSystem.addNotification(notification)
  }

  handleRemove(notification) {
    this.state.notificationSystem.removeNotification(notification)
  }

  handleRemoveByUid(uid) {
    this.state.notificationSystem.removeNotification(uid)
  }

  handleNotificationImportSamplesFromFile(result) {
    let num = result.data.length;
    let status = result.status;
    let sdf = result.sdf
    let message = result.message;
    this.handleRemoveByUid("import_samples_upload");
    let notification = {
      title: "Oops!",
      message: message + "\n Please check the file and try again.",
      level: "error",
      position: "bl",
      autoDismiss: 0
    }
    if (sdf) {
      if (status == "ok") {
        notification = {
          title: "Success",
          message: message,
          level: "success",
          position: "bl",
          autoDismiss: 10
        }
      } else if (status == "failed"){
      } else if (status == "error"){
      } else if (status == "invalid"){
        notification.message = message;
      }
    } else {
      if (status == "ok") {
        notification = {
          title: "Success",
          message: "The "+num+" samples have been imported successfully",
          level: "success",
          position: "bl",
          autoDismiss: 10
        }
      } else if (status == "failed"){
      } else if (status == "error"){
      } else if (status == "invalid"){
        notification.message = message;
      }
    }

    this.handleAdd(notification);
  }

  handleSetComponentReference(ref) {
    this.state.notificationSystem = ref;
  }
}

export default alt.createStore(NotificationStore, 'NotificationStore')
