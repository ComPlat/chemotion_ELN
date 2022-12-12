import React from 'react';
import { Glyphicon } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

class SampleTaskNavigationElement extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      loading: false // unused until I figure out how to chain two requests and only do something if they both finish
    };
  }

  componentDidMount() {
    this.loadSampleTasks();
  }

  loadSampleTasks() {
    this.context.sampleTasks.loadOpenSampleTasks();
    this.context.sampleTasks.loadOpenFreeScans()
  }

  render() {
    return (
      <div
        className="sampleTaskNavigationElement"
        style={{ padding: '7px' }}
      >
        <i className="fa fa-image" />
        <span
          className="sampleTaskNavigationElement-title"
          onClick={() => this.context.sampleTasks.showSampleTaskInbox()}
          style={{ marginLeft: '10px', marginRight: '2px' }}
        >
          SampleTasks ({this.context.sampleTasks.openSampleTaskCount} / {this.context.sampleTasks.openFreeScanCount})
        </span>
        <Glyphicon bsSize="small" glyph="refresh" style={{ marginLeft: '10px' }} onClick={() => this.loadSampleTasks()} />
      </div>
    );
  }
}

export default observer(SampleTaskNavigationElement);
