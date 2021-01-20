import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
// import InboxActions from '../actions/InboxActions';

export default class MoveToAnalysisButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
      matchingAnalyses: [
        { id: 1, title: 'Subject', fieldName: 'subject' },
        { id: 2, title: 'Alternate Identifier', fieldName: 'alternate_identifier' },
        { id: 3, title: 'Related Identifier', fieldName: 'related_identifier' },
        { id: 4, title: 'Description', fieldName: 'description' }
      ]
    };
  }

  fetchMatchingData() {
    const { attachment } = this.props;

    console.log(`fetchMatchingData: ${attachment}`);
  }

  toggleTooltip() {
    const { showTooltip } = this.state;
    if (showTooltip === false) {
      this.fetchMatchingData();
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
    const { matchingAnalyses } = this.state;

    if (this.matchingAnalysesCount() === 0) {
      return (
        <div>No matching Samples found<br /></div>
      );
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
          {element.title}
        </Button>
        <br />
      </div>
    );
  }

  render() {
    const { connectDragSource, sourceType, attachment, attachmentId, largerInbox } = this.props;
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
  attachmentId: PropTypes.number.isRequired
};

MoveToAnalysisButton.defaultProps = {
  // largerInbox: false
};
