import React from 'react';
import PropTypes from 'prop-types';
import { Button, Table, Card } from 'react-bootstrap';

import ComputeTaskActions from 'src/stores/alt/actions/ComputeTaskActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import ComputeTaskStore from 'src/stores/alt/stores/ComputeTaskStore';
import ComputeTask from 'src/apps/mydb/elements/details/computeTasks/ComputeTask';

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
      <Card className="detail-card">
        <Card.Header className="d-flex align-items-baseline justify-content-between">
          Task
          <Button
            key="closeBtn"
            onClick={this.onClose}
            variant="danger"
            size="xxsm"
            className="ms-auto"
          >
            <i className="fa fa-times" />
          </Button>
        </Card.Header>
        <Card.Body>
          <Table striped condensed hover>
            <thead>
              <tr>
                <th className="text-center">Sample</th>
                <th className="text-center">Status</th>
                <th className="text-center">Updated at</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
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
        </Card.Body>
      </Card>
    );
  }
}

ComputeTaskContainer.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  task: PropTypes.object.isRequired
};
