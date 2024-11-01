import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';

import CollapsibleIconButton from 'src/apps/mydb/layout/sidebar/CollapsibleIconButton';

const SampleTaskNavigationElement = ({ isCollapsed }) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  useEffect(() => sampleTasksStore.load(), []);

  return (
    <CollapsibleIconButton
      isCollapsed={isCollapsed}
      label="Sample Tasks"
      variant="light"
      icon="fa-image"
      onClick={sampleTasksStore.showSampleTaskInbox}
      badgeCount={sampleTasksStore.openSampleTaskCount}
    />
  );
}

export default observer(SampleTaskNavigationElement);

SampleTaskNavigationElement.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};
