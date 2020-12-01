import React from 'react';
import PropTypes from 'prop-types';
import { Button, Label } from 'react-bootstrap';

import Aviator from 'aviator';

const statusMap = {
  not_computed: 'pending'
};

export default class ComputeTask extends React.Component {
  constructor(props) {
    super(props);

    this.navigateSample = this.navigateSample.bind(this);
    this.checkState = this.checkState.bind(this);
    this.revokeTask = this.revokeTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
  }

  navigateSample() {
    const { task } = this.props;
    const currentURI = Aviator.getCurrentURI();

    const collectionMatch = currentURI.match(/\/collection\/(\d+)\//);
    if (collectionMatch) {
      const collectionId = collectionMatch[1];
      const url = `/collection/${collectionId}/sample/${task.sampleId}`;
      Aviator.navigate(url);
    }
  }

  checkState() {
    const { task } = this.props;
    this.props.checkState(task.id);
  }

  revokeTask() {
    const { task } = this.props;
    this.props.revokeTask(task.id);
  }

  deleteTask() {
    const { task } = this.props;
    this.props.deleteTask(task.id);
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
        <td style={{ textAlign: 'center' }}>
          <Label bsStyle="primary">{displayStatus}</Label>
        </td>
        <td style={{ textAlign: 'center' }}>{task.updatedAt}</td>
        <td style={{ textAlign: 'center' }}>
          <Button bsStyle="info" onClick={this.checkState} bsSize="xs" style={{ width: '22px' }}>
            <i className="fa fa-long-arrow-up" />
            <i className="fa fa-long-arrow-down" />
          </Button>
          &nbsp;&nbsp;
          <Button bsStyle="warning" onClick={this.revokeTask} bsSize="xs">
            <i className="fa fa-stop" />
          </Button>
          &nbsp;&nbsp;
          <Button bsStyle="danger" onClick={this.deleteTask} bsSize="xs">
            <i className="fa fa-trash" />
          </Button>
        </td>
      </tr>
    );
  }
}

ComputeTask.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  task: PropTypes.object.isRequired,
  checkState: PropTypes.func.isRequired,
  revokeTask: PropTypes.func.isRequired,
  deleteTask: PropTypes.func.isRequired,
};
