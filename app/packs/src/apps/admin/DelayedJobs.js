import { Button, OverlayTrigger, Panel, Table, Tooltip } from 'react-bootstrap';
import React, { Component } from 'react';
import AdminFetcher from 'src/fetchers/AdminFetcher';

const tipRestartJob = <Tooltip id="restart_tooltip">Update run_at</Tooltip>;

export default class DelayedJobs extends Component {
  constructor(props) {
    super(props);
    this.state = {
      jobs: [],
    };
    this.handleFetchJob = this.handleFetchJob.bind(this);
  }

  componentDidMount() {
    this.handleFetchJob();
  }

  handleFetchJob() {
    AdminFetcher.fetchJobs()
      .then((result) => {
        this.setState({
          jobs: result.jobs,
        });
      });
  }

  handleRestartFetch(id) {
    AdminFetcher.restartJob({ id })
      .then(() => this.handleFetchJob());
  }

  renderShowBtn(job) {
    // if (job.last_error) {
    if (true) {
      return (
        <OverlayTrigger placement="top" overlay={tipRestartJob}>
          <Button
            bsSize="xsmall"
            bsStyle="success"
            onClick={() => this.handleRestartFetch(job.id)}
          >
            <i className="fa fa-play" aria-hidden="true" />
          </Button>
        </OverlayTrigger>);
    }
    return '';
  }

  render() {
    const { jobs } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="4%" colSpan="2">ID</th>
        <th width="5%">Queue</th>
        <th width="5%">Job Class</th>
        <th width="5%">Run At</th>
        <th width="5%">Failed At</th>
        <th width="4%">Attempts</th>
        <th width="4%">Priority</th>
        <th width="50%">Last Errors</th>
      </tr>
    );

    const tbody = jobs.map(job => (
      <tr key={`row_${job.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td> {job.id} </td>
        <td> {this.renderShowBtn(job)} </td>
        <td> {job.queue} </td>
        <td> {job.handler.split(' ')[4].trim()} </td>
        <td> {job.run_at} </td>
        <td> {job.failed_at} </td>
        <td> {job.attempts} </td>
        <td> {job.priority} </td>
        <td><textarea defaultValue={job.last_error} style={{ maxWidth: '100%' }} /></td>
      </tr>
    ));

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Delayed Jobs
            </Panel.Title>
          </Panel.Heading>
          <Table responsive hover bordered>
            <thead>
              {tcolumn}
            </thead>
            <tbody>
              {tbody}
            </tbody>
          </Table>
        </Panel>
      </div>
    );
  }
}
