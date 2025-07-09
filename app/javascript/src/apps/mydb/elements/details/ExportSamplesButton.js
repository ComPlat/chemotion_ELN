import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';

export default class ExportSamplesButton extends Component {
  constructor(props) {
    super(props);
    this.state = { startExport: false };
    this.handleExport = this.handleExport.bind(this);
  }

  handleExport() {
    this.setState({ startExport: true });

    const { type, id } = this.props;
    CollectionsFetcher.expotSamples(type, id)
      .then(() => { this.setState({ startExport: false }); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  render() {
    const { startExport } = this.state;
    const { size } = this.props;
    return (
      <Button
        variant="primary"
        size={size || 'sm'}
        onClick={this.handleExport}
      >
        <i className="fa fa-upload" />
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
