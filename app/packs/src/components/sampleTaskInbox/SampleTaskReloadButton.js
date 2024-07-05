import React, { useContext } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import Glyphicon from 'src/components/legacyBootstrap/Glyphicon'

const SampleTaskReloadButton = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  return (
    <i
      className="fa fa-refresh"
      aria-hidden="true"
      style={{ cursor: 'Pointer' }}
      title="Reload sample tasks"
      onClick={sampleTasksStore.load}
    />
  );
}
export default observer(SampleTaskReloadButton);
