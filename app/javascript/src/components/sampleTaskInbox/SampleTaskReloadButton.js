import React, { useContext } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

const SampleTaskReloadButton = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  return (
    <i
      className="fa fa-refresh me-3"
      aria-hidden="true"
      role="button"
      title="Reload sample tasks"
      onClick={sampleTasksStore.load}
    />
  );
}
export default observer(SampleTaskReloadButton);
