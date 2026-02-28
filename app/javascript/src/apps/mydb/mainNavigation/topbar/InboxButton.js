import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import 'whatwg-fetch';

import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';

export default function InboxButton() {
  const { numberOfAttachments } = InboxStore.getState();
  const [badgeCount, setBadgeCount] = useState(numberOfAttachments);

  useEffect(() => {
    const onInboxStoreChange = ({ numberOfAttachments }) => setBadgeCount(numberOfAttachments);
    InboxStore.listen(onInboxStoreChange);
    InboxActions.fetchInboxCount();
    return () => InboxStore.unlisten(onInboxStoreChange);
  }, []);

  return (
    <NotificationButton
      label="Inbox"
      icon="fa-inbox"
      onClick={InboxActions.toggleInboxModal}
      badgeCount={badgeCount}
    />
  );
}
