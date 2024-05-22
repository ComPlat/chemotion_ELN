import React, { useContext } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import Glyphicon from 'src/components/legacyBootstrap/Glyphicon'

const SampleTaskReloadButton = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  return (
    <Glyphicon
      bsSize="small"
      style={{ cursor: 'Pointer' }}
      glyph="refresh"
      title="Reload sample tasks"
      onClick={sampleTasksStore.load}
    />
  );
}
export default observer(SampleTaskReloadButton);
