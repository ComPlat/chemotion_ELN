import alt from '../alt'
import NotificationActions from '../actions/NotificationActions'
import ElementActions from '../actions/ElementActions'


class NotificationStore {
  constructor() {
    this.state = {
      notifications: []
    }

    this.bindListeners({
      handleAdd: NotificationActions.add,
      handleRemove: NotificationActions.remove,
      handleRemoveByKey: NotificationActions.removeByKey,
      handleNotificationImportSamplesFromFile: ElementActions.importSamplesFromFile,

    })
  }

  handleAdd(notification) {
    this.state.notifications.push(notification)
  }

  handleRemove(notification) {
    let {notifications} = this.state
    notifications.splice(notifications.indexOf(notification), 1)
    this.state.notifications = notifications
  }

  handleRemoveByKey(key) {
    let {notifications} = this.state
    let notification = notifications.find(notification => {
      if(notification.key) notification.key == key
    })
    notifications.splice(notifications.indexOf(notification), 1)
    this.state.notifications = notifications
  }

  handleNotificationImportSamplesFromFile(result) {
    this.handleRemoveByKey("import_samples_upload");
    let notification;
    if (result.import.length > 0) {
      notification = {
        key: "import_samples_success",
        type: 'success',
        message: {
          body: () => "The samples have been imported successfully",
        }
      }
    } else {
      notification = {
        key: "import_samples_fail",
        type: 'danger',
        message: {
          body: () => "There was an error with the import of Samples. Please check the file and try again.",
        }
      }
    }
    this.handleAdd(notification);
  }
}

export default alt.createStore(NotificationStore, 'NotificationStore')