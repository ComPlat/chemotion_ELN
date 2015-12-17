import React, {Component} from 'react'
import connectToStores from 'alt/utils/connectToStores'
import NotificationActions from './actions/NotificationActions'
import NotificationStore from './stores/NotificationStore'
import {Alert} from 'react-bootstrap';


class Notifications extends Component {

  notification(notification, index) {
    if(notification.closeTimeout && notification.closeTimeout !== 0) {
      let closeTimeout = notification.closeTimeout || 0
      setTimeout(() => NotificationActions.remove(notification), closeTimeout)
    }

    let header_message = notification.message.header;
    let header = header_message ? <h4>{header_message()}</h4> : null

    return (
      <Alert className="notification" bsStyle={notification.type} onDismiss={() => NotificationActions.remove(notification)}>
        <h4>{header}</h4> 
        <p>{notification.message.body()}</p>
      </Alert>
    )
  }

  render() {
    let {notifications} = this.props;
    let notification = notifications.length > 0 ? this.notification(notifications[0]) : undefined;
    return (
      <div>
        {notification}
      </div>
    )
  }
}

let getStores = () => [NotificationStore]
let getPropsFromStores = () => NotificationStore.getState()
export default connectToStores({getStores, getPropsFromStores}, Notifications)