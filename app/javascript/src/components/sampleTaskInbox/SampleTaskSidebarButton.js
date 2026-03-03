import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';

import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

function SampleTaskNavigationElement() {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  useEffect(() => sampleTasksStore.load(), []);

  return (
    <NotificationButton
      label="Weighing Tasks"
      icon="fa-image"
      onClick={sampleTasksStore.toggleSampleTaskInbox}
      badgeCount={sampleTasksStore.openSampleTaskCount}
    />
  );
}

export default observer(SampleTaskNavigationElement);
