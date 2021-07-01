import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'react-bootstrap';
import InboxFetcher from '../fetchers/InboxFetcher';
import InboxActions from '../actions/InboxActions';
import DragDropItemTypes from '../DragDropItemTypes';

export default class MoveToAnalysisButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
      loading: false,
      matchingAnalyses: []
    };
  }

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

  removeAttachment() {
    const { attachment, sourceType } = this.props;

    switch (sourceType) {
      default:
        return false;
      case DragDropItemTypes.DATA:
        InboxActions.removeAttachmentFromList(attachment);
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        InboxActions.removeUnlinkedAttachmentFromList(attachment);
        break;
    }

    return true;
  }


  moveToAnalysis(sampleId, attachmentId) {
    InboxFetcher.assignToAnalysis(sampleId, attachmentId)
      .then(() => {
        this.removeAttachment();
      }).catch((errorMessage) => {
        this.setState({ loading: false });
        console.log(errorMessage);
      });
    this.toggleTooltip();
  }

  renderAnalysesButtons() {
    const { loading, matchingAnalyses } = this.state;
    const { attachment } = this.props;

    if (this.matchingAnalysesCount() === 0) {
      if (loading === true) {
        return (<div><i className="fa fa-refresh fa-spin" />&nbsp;loading...<br /></div>);
      }
      return (<div>No matching Samples found.<br /></div>);
    }

    return (
      <div>
        Move to Sample:<br />
        { matchingAnalyses.map(sample => (
          this.renderMoveButton(attachment, sample)
          )) }
      </div>
    );
  }

  renderMoveButton(attachment, sample) {
    return (
      <div align="left" key={`btn_${sample.id}`}>
        <Button
          bsStyle="success"
          bsSize="small"
          onClick={() => this.moveToAnalysis(sample.id, attachment.id)}
        >
          <i className="fa fa-arrow-circle-right" aria-hidden="true" />&nbsp;
          {sample.short_label} {sample.name}
        </Button>
        <br />
      </div>
    );
  }

  render() {
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
  attachment: PropTypes.object.isRequired,
  sourceType: PropTypes.string
};

MoveToAnalysisButton.defaultProps = {
  sourceType: ''
};
