import React from 'react';

const LEVEL_CLASS = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info'
};

class NotificationSystem extends React.Component {
  constructor(props) {
    super(props);
    this.state = { notifications: [] };
    this.timers = new Map();
  }

  componentWillUnmount() {
    this.timers.forEach((timerId) => clearTimeout(timerId));
    this.timers.clear();
  }

  addNotification(notification) {
    const uid = notification?.uid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextNotification = { ...notification, uid };

    this.setState((prevState) => {
      const withoutSameUid = prevState.notifications.filter((n) => n.uid !== uid);
      return { notifications: [...withoutSameUid, nextNotification] };
    });

    if (notification?.autoDismiss && notification.autoDismiss > 0) {
      const timerId = setTimeout(() => this.removeNotification(uid), notification.autoDismiss * 1000);
      this.timers.set(uid, timerId);
    }

    return uid;
  }

  removeNotification(notificationOrUid) {
    const uid = typeof notificationOrUid === 'object' ? notificationOrUid?.uid : notificationOrUid;
    if (!uid) return;

    const timerId = this.timers.get(uid);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(uid);
    }

    this.setState((prevState) => ({
      notifications: prevState.notifications.filter((n) => n.uid !== uid)
    }));
  }

  clearNotifications() {
    this.timers.forEach((timerId) => clearTimeout(timerId));
    this.timers.clear();
    this.setState({ notifications: [] });
  }

  render() {
    const { notifications } = this.state;

    return (
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 2000,
          width: 420,
          maxWidth: 'calc(100vw - 32px)'
        }}
      >
        {notifications.map((notification) => (
          <div key={notification.uid} className={`alert alert-${LEVEL_CLASS[notification.level] || 'info'}`} role="alert">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                {notification.title ? <strong>{notification.title}</strong> : null}
                <div>{notification.message}</div>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => this.removeNotification(notification.uid)}
              />
            </div>
            {notification.action?.label ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-2"
                onClick={() => {
                  notification.action.callback?.();
                  this.removeNotification(notification.uid);
                }}
              >
                {notification.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
}

export default NotificationSystem;
