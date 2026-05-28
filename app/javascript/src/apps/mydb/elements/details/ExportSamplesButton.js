import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';

export default class ExportSamplesButton extends Component {
  constructor(props) {
    super(props);
    this.state = { startExport: false };
    this.handleExport = this.handleExport.bind(this);
  }

  handleExport() {
    this.setState({ startExport: true });

    const { type, id } = this.props;
    ReportsFetcher.exportSamples(type, id)
      .then(() => { this.setState({ startExport: false }); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  render() {
    const { startExport } = this.state;
    return (
      <Button
        variant="secondary"
        onClick={this.handleExport}
      >
        Export samples
        {startExport && (
          <i className="fa fa-spin fa-spinner ms-2" />
        )}
      </Button>
    );
  }
}

ExportSamplesButton.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired
};
