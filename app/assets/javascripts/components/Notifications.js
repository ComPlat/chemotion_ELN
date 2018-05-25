import React, {Component} from 'react';
import NotificationSystem from 'react-notification-system';
import connectToStores from 'alt-utils/lib/connectToStores';

import NotificationActions from './actions/NotificationActions';
import NotificationStore from './stores/NotificationStore';

class Notifications extends Component {
  componentDidMount() {
    NotificationActions.setComponentReference(this.refs.notificationSystem);
  }

  render() {
    return (
      <div>
        <NotificationSystem ref="notificationSystem" />
      </div>
    );
  }
}

const getStores = () => [NotificationStore];
const getPropsFromStores = () => NotificationStore.getState();
export default connectToStores({ getStores, getPropsFromStores }, Notifications);
