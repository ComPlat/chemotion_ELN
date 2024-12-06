import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

const SampleTaskNavigationElement = () => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  useEffect(() => sampleTasksStore.load(), []);

  return (
    <SidebarButton
      label="Sample Tasks"
      icon="fa-image"
      onClick={sampleTasksStore.showSampleTaskInbox}
      badgeCount={sampleTasksStore.openSampleTaskCount}
    />
  );
}

export default observer(SampleTaskNavigationElement);
