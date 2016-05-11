import React, {Component} from 'react'
import connectToStores from 'alt-utils/lib/connectToStores';
import NotificationActions from './actions/NotificationActions'
import NotificationStore from './stores/NotificationStore'
import {Alert} from 'react-bootstrap';

import NotificationSystem from 'react-notification-system';


class Notifications extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    NotificationActions.setComponentReference(this.refs.notificationSystem);
  }

  render() {
    return (
      <div>
        <NotificationSystem ref="notificationSystem" />
      </div>
    )
  }
}

let getStores = () => [NotificationStore]
let getPropsFromStores = () => NotificationStore.getState()
export default connectToStores({getStores, getPropsFromStores}, Notifications)
