import React from 'react';
import Draggable from 'react-draggable';
import { values } from 'mobx';
import { Button, Panel } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

class SampleTaskInbox extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
  }

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
        <Panel byStyle="info">
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
    let sample_tasks = values(this.context.sampleTasks.open_sample_tasks);

    // TODO: return image as well
    return sample_tasks.map(sample_task => {
      return (
        <Panel byStyle="info">
          <Panel.Heading>
            {sample_task.description}
          </Panel.Heading>
          <Panel.Body>
            <ul>
              <li><strong>Measurement value:</strong> {sample_task.measurement_value}</li>
              <li><strong>Measurement unit:</strong> {sample_task.measurement_unit}</li>
              <li><strong>Additional note:</strong> {sample_task.additional_note}</li>
              <li><strong>Private note:</strong> {sample_task.private_note}</li>
            </ul>
          </Panel.Body>
          <Panel.Footer>
            SAMPLE DROPZONE HERE
          </Panel.Footer>
        </Panel>
      );
    });
  }


  render() {
    let display_value = this.context.sampleTasks.sampleTaskInboxVisible ? 'block' : 'none';

    return (
      <div
        className="sampleTaskInbox small-col col-md-6"
        style={{ zIndex: 10, position: 'absolute', top: '70px', left: '10px', display: display_value }}
      >
        <Draggable handle=".handle" bounds="body">
          <Panel bsStyle="primary">
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
      </div>
    );
  }
}

export default observer(SampleTaskInbox);
