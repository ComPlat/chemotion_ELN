import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import Aviator from 'aviator';

const statusMap = {
  not_computed: 'pending'
};

export default class ComputeTask extends React.Component {
  constructor(props) {
    super(props);

    this.navigateSample = this.navigateSample.bind(this);
    this.refreshStatus = this.refreshStatus.bind(this);
    this.removeTask = this.removeTask.bind(this);
  }

  navigateSample() {
    const { task } = this.props;
    const currentURI = Aviator.getCurrentURI();

    const collectionMatch = currentURI.match(/\/collection\/(\d+)\//);
    if (collectionMatch) {
      const collectionId = collectionMatch[1];
      const url = `/collection/${collectionId}/sample/${task.sampleId}`;
      // Aviator.navigate(url, { silent: true });
      Aviator.navigate(url);
    }
  }

  refreshStatus() {
  }

  removeTask() {
  }

  render() {
    const { task } = this.props;
    const { status } = task;
    const displayStatus = (status in statusMap) ? statusMap[status] : status;

    return (
      <tr>
        <td style={{ textAlign: 'center' }}>
          <Button bsStyle="link" onClick={this.navigateSample}>
            Sample
          </Button>
        </td>
        <td style={{ textAlign: 'center' }}>{displayStatus}</td>
        <td style={{ textAlign: 'center' }}>{task.updatedAt}</td>
        <td style={{ textAlign: 'center' }}>
          <Button bsStyle="info" onClick={this.refreshStatus} bsSize="xs">
            <i className="fa fa-refresh" />
          </Button>
          &nbsp;&nbsp;
          <Button bsStyle="danger" onClick={this.removeTask} bsSize="xs">
            <i className="fa fa-times" />
          </Button>
        </td>
      </tr>
    );
  }
}

ComputeTask.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  task: PropTypes.object.isRequired
};
