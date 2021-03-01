import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'react-bootstrap';
import InboxFetcher from '../fetchers/InboxFetcher';
// import InboxActions from '../actions/InboxActions';

export default class MoveToAnalysisButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
      loading: false,
      matchingAnalyses: []
    };
  }

  // getAnalysisIdentifier(filename) {
  //   const firstIndex = filename.indexOf('-');
  //   const filenameWithoutPrefix = (firstIndex === -1 ? filename : filename.substr(firstIndex+1, filename.length-1));
  //   const lastIndex = filenameWithoutPrefix.lastIndexOf('.');
  //   return (lastIndex === -1 ? filenameWithoutPrefix : filenameWithoutPrefix.substr(0, lastIndex));
  // };

  fetchMatchingSamples() {
    this.setState({ loading: true });
    const { attachment } = this.props;

    InboxFetcher.fetchMatchingSamples(attachment.filename)
      .then((result) => {
        this.setState({ matchingAnalyses: result.samples, loading: false });
      }).catch((errorMessage) => {
        this.setState({ loading: false });
        console.log(errorMessage);
      });
  }

  toggleTooltip() {
    const { showTooltip } = this.state;
    if (showTooltip === false && this.matchingAnalysesCount() === 0) {
      this.fetchMatchingSamples();
    }

    this.setState(prevState => ({ ...prevState, showTooltip: !prevState.showTooltip }));
  }

  matchingAnalysesCount() {
    return (this.state.matchingAnalyses && this.state.matchingAnalyses.length) || 0;
  }

  moveToAnalysis(id) {
    console.log(`moveToAnalysis: ${id}`);
    this.toggleTooltip();
  }

  renderAnalysesButtons() {
    const { loading, matchingAnalyses } = this.state;

    if (this.matchingAnalysesCount() === 0) {
      if (loading === true) {
        return (<div><i className="fa fa-refresh fa-spin" />&nbsp;loading...<br /></div>);
      }
      return (<div>No matching Samples found.<br /></div>);
    }

    return (
      <div>
        Move to Analysis:<br />
        { matchingAnalyses.map(element => (
          this.renderMoveButton(element)
          )) }
      </div>
    );
  }

  renderMoveButton(element) {
    return (
      <div align="left" key={`btn_${element.id}`}>
        <Button
          bsStyle="success"
          bsSize="small"
          onClick={() => this.moveToAnalysis(element.id)}
        >
          <i className="fa fa-arrow-circle-right" aria-hidden="true" />&nbsp;
          {element.name}
        </Button>
        <br />
      </div>
    );
  }

  render() {
    // const { connectDragSource, sourceType, attachment, attachmentId, largerInbox } = this.props;
    const { showTooltip } = this.state;

    const abortButton = (
      <div align="right">
        <Button
          bsStyle="warning"
          bsSize="small"
          onClick={() => this.toggleTooltip()}
        >
          <i className="fa fa-times-circle" aria-hidden="true" />&nbsp;
          Abort
        </Button>
      </div>
    );

    return (
      <span>
        <i className="icon-sample" onClick={() => this.toggleTooltip()} style={{ cursor: "pointer" }}>&nbsp;</i>
        {showTooltip ? (
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            {this.renderAnalysesButtons()}
            {abortButton}
          </Tooltip>
        ) : null}
      </span>
    );
  }
}

MoveToAnalysisButton.propTypes = {
  // connectDragSource: PropTypes.func.isRequired,
  // largerInbox: PropTypes.bool,
  attachment: PropTypes.object.isRequired
};

MoveToAnalysisButton.defaultProps = {
  // largerInbox: false
};
