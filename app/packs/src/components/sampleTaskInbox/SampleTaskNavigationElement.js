import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SampleTaskNavigationElement = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  const loadSampleTasks = () => {
    sampleTasksStore.load();
  }

  useEffect(loadSampleTasks, []) // do this once at the creation of the component

  const title = `${sampleTasksStore.openSampleTaskCount} open Sample Tasks`

  return (
    <Button
      id="inbox-button"
      title={title}
      variant="light"
      size="xs"
      onClick={sampleTasksStore.showSampleTaskInbox}
      style={{
        width: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <i className="fa fa-image" />
      {sampleTasksStore.openSampleTaskCount > 0 && (
        <span
          className="badge badge-pill"
          style={{
            top: '25px',
            left: '25px',
            fontSize: '8px',
            position: 'absolute',
            display: 'flex',
          }}
        >
          {sampleTasksStore.openSampleTaskCount}
        </span>
      )}
    </Button>
  );
}

export default observer(SampleTaskNavigationElement);
