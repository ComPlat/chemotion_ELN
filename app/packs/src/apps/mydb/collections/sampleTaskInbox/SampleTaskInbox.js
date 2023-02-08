import DragDropItemTypes from 'src/components/DragDropItemTypes';
import Draggable from 'react-draggable';
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

  const getSampleFromItem = (item, itemType) => {
    if (itemType === 'sample') {
      return item.element;
    }
    if (itemType === 'material') {
      return item.material;
    }
  }
  const dropConfig = (required_scan_results = 1) => {
    return {
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
          sampleTasksStore.createSampleTask(sample.id, required_scan_results);
        }
      },
    }
  };
  const [_colProps1, singleScanDropRef] = useDrop(dropConfig(1));
  const [_colProps2, doubleScanDropRef] = useDrop(dropConfig(2));
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

  const openSampleTasks = () => {
    let sampleTasks = values(sampleTasksStore.sample_tasks);

    return sampleTasks.map(sampleTask => (
      <SampleTaskCard sampleTask={sampleTask} key={`sampleTask_${sampleTask.id}`} />
    ));
  }

  const sampleDropzone = (dropRef, text) => {
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
            {text}
          </div>
        </Panel.Footer>
      </Panel>
    );
  };

  let display_value = sampleTasksStore.inboxVisible ? 'block' : 'none';

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
            <div className="col-md-11">{openSampleTaskCount()} open SampleTasks</div>
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
          <div className="row sampleTaskCreationDropzones">
            <div class="col-sm-6">
              {sampleDropzone(singleScanDropRef, 'Single Scan (weighing only compound)')}
            </div>
            <div class="col-sm-6">
              {sampleDropzone(doubleScanDropRef, 'Double Scan (weighing vessel and vessel+compound to calculate difference')}
            </div>
          </div>
          {openSampleTasks()}
        </Panel.Body>
      </Panel>
    </Draggable>
  );
}

export default observer(SampleTaskInbox);
