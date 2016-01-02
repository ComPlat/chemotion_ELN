import alt from '../alt'

class NotificationActions {
  add(notification) {
    this.dispatch(notification)
  }

  remove(notification) {
    this.dispatch(notification)
  }

  removeByUid(uid) {
    this.dispatch(uid)
  }

  setComponentReference(input) {
    this.dispatch(input)
  }
}

export default alt.createActions(NotificationActions)