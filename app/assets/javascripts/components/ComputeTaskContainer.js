import React from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, Table } from 'react-bootstrap';

import ComputeTaskActions from './actions/ComputeTaskActions';
import DetailActions from './actions/DetailActions';
import LoadingActions from './actions/LoadingActions';

import ComputeTaskStore from './stores/ComputeTaskStore';
import ComputeTask from './ComputeTask';

export default class ComputeTaskContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tasks: []
    };

    this.onChangeComputeTask = this.onChangeComputeTask.bind(this);
    this.onClose = this.onClose.bind(this);

    this.checkState = this.checkState.bind(this);
    this.revokeTask = this.revokeTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
  }

  componentDidMount() {
    ComputeTaskStore.listen(this.onChangeComputeTask);

    ComputeTaskActions.fetchAll();
  }

  componentWillUnmount() {
    ComputeTaskStore.unlisten(this.onChangeComputeTask);
  }

  onClose() {
    DetailActions.close(this.props.task, true);
  }

  onChangeComputeTask(state) {
    const { tasks } = state;

    this.setState({ tasks });
  }

  /* eslint-disable class-methods-use-this */
  checkState(taskId) {
    LoadingActions.start();
    ComputeTaskActions.checkState(taskId);
  }

  revokeTask(taskId) {
    LoadingActions.start();
    ComputeTaskActions.revokeTask(taskId);
  }

  deleteTask(taskId) {
    LoadingActions.start();
    ComputeTaskActions.deleteTask(taskId);
  }
  /* eslint-enable class-methods-use-this */

  render() {
    const { tasks } = this.state;

    return (
      <Panel bsStyle="primary">
        <Panel.Heading>
          {'Task'}
          <div className="button-right">
            <Button
              key="closeBtn"
              onClick={this.onClose}
              bsStyle="danger"
              bsSize="xsmall"
              className="button-right"
            >
              <i className="fa fa-times" />
            </Button>
          </div>
        </Panel.Heading>
        <Panel.Body>
          <Table striped condensed hover>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Sample ID</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Updated at</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <ComputeTask
                  key={task.id}
                  task={task}
                  checkState={this.checkState}
                  revokeTask={this.revokeTask}
                  deleteTask={this.deleteTask}
                />
              ))}
            </tbody>
          </Table>
        </Panel.Body>
      </Panel>
    );
  }
}

ComputeTaskContainer.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  task: PropTypes.object.isRequired
};
