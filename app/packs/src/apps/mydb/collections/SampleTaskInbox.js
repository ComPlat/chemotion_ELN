import DragDropItemTypes from 'src/components/DragDropItemTypes';
import Draggable from 'react-draggable';
import FreeScanCard from 'src/apps/mydb/collections/sampleTaskInbox/FreeScanCard';
import React, { useContext } from 'react';
import SampleTaskCard from 'src/apps/mydb/collections/sampleTaskInbox/SampleTaskCard';
import { Button, Panel } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { useDrop } from 'react-dnd';
import { values } from 'mobx';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const SampleTaskInbox = ({}) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;

  const createSampleTask = (sample) => {
    sampleTasksStore.createSampleTask(sample.id);
  };

  const getSampleFromItem = (item, itemType) => {
    if (itemType === 'sample') {
      return item.element;
    }
    if (itemType === 'material') {
      return item.material;
    }
  }
  const [collectedProps, dropRef] = useDrop({
    accept: [
      DragDropItemTypes.SAMPLE,
      DragDropItemTypes.MATERIAL
    ],
    drop: (item, monitor) => {
      let sample = getSampleFromItem(item, monitor.getItemType())
      let sampleTaskForSampleAlreadyExists = sampleTasksStore.sampleTaskForSample(sample.id);
      if (sampleTaskForSampleAlreadyExists) {
        // create notification
        sendErrorNotification(`SampleTask for sample id ${sample.id} already exists`);
      } else {
        createSampleTask(sample);
      }
    },
  });
  const sendErrorNotification = (message) => {
    const notification = {
      title: message,
      message: message,
      level: 'error',
      dismissible: 'button',
      autoDismiss: 5,
      position: 'tr',
      uid: 'SampleTaskInbox'
    };
    NotificationActions.add(notification);
  }

  const openSampleTaskCount = () => {
    let count = sampleTasksStore.openSampleTaskCount;
    if (count == 0) { return 'no'; }
    return count;
  }

  const openFreeScanCount = () => {
    let count = sampleTasksStore.openFreeScanCount;
    if (count == 0) { return 'no'; }
    return count;
  }

  const openSampleTasks = () => {
    let sampleTasks = values(sampleTasksStore.open_sample_tasks);

    return sampleTasks.map(sampleTask => (
      <SampleTaskCard sampleTask={sampleTask} key={`sampleTask_${sampleTask.id}`} />
    ));
  }

  const openFreeScans = () => {
    let sampleTasks = values(sampleTasksStore.open_free_scans);

    return sampleTasks.map(sampleTask => (
      <FreeScanCard sampleTask={sampleTask} key={`openFreeScan_${sampleTask.id}`} />
    ));
  }

  const sampleDropzone = () => {
    const style = {
      padding: 10,
      borderStyle: 'dashed',
      textAlign: 'center',
      color: 'gray',
      marginTop: '12px',
      marginBottom: '8px'
    };

    return (
      <Panel>
        <Panel.Footer>
          <div style={style} ref={dropRef}>
            Drop Sample here to create a new SampleTask.
          </div>
        </Panel.Footer>
      </Panel>
    );
  };

  let display_value = sampleTasksStore.sampleTaskInboxVisible ? 'block' : 'none';

  return (
    <Draggable
      handle=".handle"
      bounds="body"
    >
      <Panel
        bsStyle="primary"
        className="sampleTaskInbox small-col col-md-6"
        style={{
          zIndex: 10, position: 'absolute', top: '70px', left: '10px', display: display_value,
          maxHeight: '80%', overflow: 'scroll'
        }}
      >
        <Panel.Heading className="handle">
          <div className="row">
            <div className="col-md-5">{openSampleTaskCount()} open SampleTasks</div>
            <div className="col-md-5 col-md-offset-1">{openFreeScanCount()} open FreeScans</div>
            <div className="col-md-1">
              <Button
                bsStyle="danger"
                bsSize="xsmall"
                className="button-right"
                onClick={sampleTasksStore.hideSampleTaskInbox}
              >
                <i className="fa fa-times" />
              </Button>
            </div>
          </div>
        </Panel.Heading>
        <Panel.Body>
          <div className="row">
            <div className="small-col col-md-5">
              {sampleDropzone()}

              {openSampleTasks()}
            </div>
            <div className="small-col col-md-5 col-md-offset-1">
              {openFreeScans()}
            </div>
          </div>
        </Panel.Body>
      </Panel>
    </Draggable>
  );
}

export default observer(SampleTaskInbox);
