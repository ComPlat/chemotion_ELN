import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

function SampleTaskNavigationElement({ isCollapsed }) {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  useEffect(() => sampleTasksStore.load(), []);

  return (
    <SidebarButton
      label="Weighing Tasks"
      icon="fa-image"
      onClick={sampleTasksStore.showSampleTaskInbox}
      badgeCount={sampleTasksStore.openSampleTaskCount}
      showLabel={false}
      isCollapsed={isCollapsed}
    />
  );
}

export default observer(SampleTaskNavigationElement);
