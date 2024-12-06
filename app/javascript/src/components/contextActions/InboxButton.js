import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import 'whatwg-fetch';

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';

export default function InboxButton({ isCollapsed }) {
  const { numberOfAttachments } = InboxStore.getState();
  const [badgeCount, setBadgeCount] = useState(numberOfAttachments);

  useEffect(() => {
    const onInboxStoreChange = ({ numberOfAttachments }) => setBadgeCount(numberOfAttachments);
    InboxStore.listen(onInboxStoreChange);
    InboxActions.fetchInboxCount();
    return () => InboxStore.unlisten(onInboxStoreChange);
  }, []);

  return (
    <SidebarButton
      label="Inbox"
      icon="fa-inbox"
      variant="light"
      onClick={InboxActions.toggleInboxModal}
      badgeCount={badgeCount}
    />
  );
}

InboxButton.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};
