import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';

export default class ExportSamplesBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { startExport: false };
  }

  handleExport(type, id) {
    this.setState({ startExport: true });
    CollectionsFetcher.exportSamples(type, id)
      .then(() => { this.setState({ startExport: false }); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  render() {
    const { type, id } = this.props;
    const { startExport } = this.state;
    return (
      <Button bsStyle="info" onClick={() => this.handleExport(type, id)}>
        Export samples{startExport ? <span>&nbsp;<i className="fa fa-spin fa-spinner" /></span> : null}
      </Button>
    );
  }
}

ExportSamplesBtn.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired
};
