import {
  Button, OverlayTrigger, Table, Tooltip
} from 'react-bootstrap';
import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';
import AdminFetcher from 'src/fetchers/AdminFetcher';

const tipRestartJob = (
  <Tooltip id="restart_tooltip">
    <FormattedMessage id="delayed_jobs-restart_tooltip" />
  </Tooltip>
);

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
    return (
      <OverlayTrigger placement="top" overlay={tipRestartJob}>
        <Button
          size="sm"
          variant="success"
          onClick={() => this.handleRestartFetch(job.id)}
        >
          <i className="fa fa-play" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    const { jobs } = this.state;

    const tcolumn = (
      <tr className="align-middle">
        <th colSpan="2"><FormattedMessage id="id" /></th>
        <th><FormattedMessage id="delayed_jobs-queue" /></th>
        <th><FormattedMessage id="delayed_jobs-job_class" /></th>
        <th><FormattedMessage id="delayed_jobs-run_at" /></th>
        <th><FormattedMessage id="delayed_jobs-failed_at" /></th>
        <th><FormattedMessage id="delayed_jobs-attempts" /></th>
        <th><FormattedMessage id="delayed_jobs-priority" /></th>
        <th className="w-50"><FormattedMessage id="delayed_jobs-last_errors" /></th>
      </tr>
    );

    const tbody = jobs.map((job) => (
      <tr key={`row_${job.id}`} className="align-middle">
        <td>
          {job.id}
        </td>
        <td>
          {this.renderShowBtn(job)}
        </td>
        <td>
          {job.queue}
        </td>
        <td>
          {job.handler.split(' ')[4].trim()}
        </td>
        <td>
          {job.run_at}
        </td>
        <td>
          {job.failed_at}
        </td>
        <td>
          {job.attempts}
        </td>
        <td>
          {job.priority}
        </td>
        <td><textarea defaultValue={job.last_error} mw-100 /></td>
      </tr>
    ));

    return (
      <div>
        <h3 className="bg-gray-200 p-3 rounded"><FormattedMessage id="delayed_jobs-title" /></h3>
        <Table responsive hover bordered>
          <thead>
            {tcolumn}
          </thead>
          <tbody>
            {tbody}
          </tbody>
        </Table>
      </div>
    );
  }
}
