import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Button, Badge } from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SampleTaskNavigationElement = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  const loadSampleTasks = () => {
    sampleTasksStore.load();
  };

  useEffect(loadSampleTasks, []); // do this once at the creation of the component

  const title = `${sampleTasksStore.openSampleTaskCount} open Sample Tasks`;

  return (
    <Button
      title={title}
      variant="light"
      size="xs"
      onClick={sampleTasksStore.showSampleTaskInbox}
      className="position-relative"
    >
      <i className="fa fa-image" />
      {sampleTasksStore.openSampleTaskCount > 0 && (
        <Badge
          pill
          bg="secondary"
          className="position-absolute top-100 start-100 translate-middle"
        >
          {sampleTasksStore.openSampleTaskCount}
        </Badge>
      )}
    </Button>
  );
}

export default observer(SampleTaskNavigationElement);
