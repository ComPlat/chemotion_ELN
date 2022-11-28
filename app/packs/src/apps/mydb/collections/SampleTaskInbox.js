import React from 'react';
import Draggable from 'react-draggable';
import { values } from 'mobx';
import { Button, Panel } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import FreeScanCard from 'src/apps/mydb/collections/sampleTaskInbox/FreeScanCard';

class SampleTaskInbox extends React.Component {
  static contextType = StoreContext;

  openSampleTaskCount() {
    let count = this.context.sampleTasks.openSampleTaskCount;
    if (count == 0) { return 'no'; }
    return count;
  }
  openFreeScanCount() {
    let count = this.context.sampleTasks.openFreeScanCount;
    if (count == 0) { return 'no'; }
    return count;
  }

  openSampleTasks() {
    let sample_tasks = values(this.context.sampleTasks.open_sample_tasks);

    return sample_tasks.map(sample_task => {
      let svg = "";
      if (sample_task.sample_svg_file) {
        svg = <img src={"/images/samples/" + sample_task.sample_svg_file} />
      } else {
        svg = 'no image available';
      }

      return (
        <Panel bsStyle="info" key={`sampleTask_${sample_task.id}`}>
          <Panel.Heading>
            {sample_task.short_label} {sample_task.display_name}
          </Panel.Heading>
          <Panel.Body>
            {svg}
          </Panel.Body>
        </Panel>
      );
    });
  }

  openFreeScans() {
    let sampleTasks = values(this.context.sampleTasks.open_free_scans);

    return sampleTasks.map(sampleTask => (
      <FreeScanCard sampleTask={sampleTask} key={`openFreeScan_${sampleTask.id}`} />
    ));
  }



  render() {
    let display_value = this.context.sampleTasks.sampleTaskInboxVisible ? 'block' : 'none';

    return (
      <Draggable
        handle=".handle"
        bounds="body"
      >
        <Panel
          bsStyle="primary"
          className="sampleTaskInbox small-col col-md-6"
          style={{ zIndex: 10, position: 'absolute', top: '70px', left: '10px', display: display_value }}
        >
          <Panel.Heading className="handle">
            <div className="row">
              <div className="col-md-5">{this.openSampleTaskCount()} open SampleTasks</div>
              <div className="col-md-5 col-md-offset-1">{this.openFreeScanCount()} open FreeScans</div>
              <div className="col-md-1">
                <Button
                  bsStyle="danger"
                  bsSize="xsmall"
                  className="button-right"
                  onClick={() => this.context.sampleTasks.hideSampleTaskInbox()}
                >
                  <i className="fa fa-times" />
                </Button>
              </div>
            </div>
          </Panel.Heading>
          <Panel.Body>
            <div className="row">
              <div className="small-col col-md-5">
                {this.openSampleTasks()}
              </div>
              <div className="small-col col-md-5 col-md-offset-1">
                {this.openFreeScans()}
              </div>
            </div>
          </Panel.Body>
        </Panel>
      </Draggable>
    );
  }
}

export default observer(SampleTaskInbox);
