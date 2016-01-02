import alt from '../alt'
import NotificationActions from '../actions/NotificationActions'
import ElementActions from '../actions/ElementActions'


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

    this.handleRemoveByUid("import_samples_upload");
    let notification;
    if (result.import.length > 0) {
      notification = {
        title: "Success",
        message: "The samples have been imported successfully",
        level: "success",
        position: "bl",
        autoDismiss: 10
      }
    } else {
      notification = {
        title: "Oops!",
        message: "There was an error with the import of Samples. Please check the file and try again.",
        level: "error",
        position: "bl",
        autoDismiss: 10
      }
    }
    this.handleAdd(notification);
  }

  handleSetComponentReference(ref) {
    this.state.notificationSystem = ref;
  }
}

export default alt.createStore(NotificationStore, 'NotificationStore')