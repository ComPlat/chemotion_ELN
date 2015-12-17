import alt from '../alt'

class NotificationActions {
  add(notification) {
    this.dispatch(notification)
  }

  remove(notification) {
    this.dispatch(notification)
  }

  removeByKey(key) {
    this.dispatch(key)
  }

}

export default alt.createActions(NotificationActions)