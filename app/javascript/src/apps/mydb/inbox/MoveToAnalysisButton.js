/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import InboxFetcher from 'src/fetchers/InboxFetcher';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import { DragDropItemTypes } from 'src/utilities/DndConst';

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

  fetchMatchingReactions() {
    this.setState({ loading: true });
    const { attachment } = this.props;

    InboxFetcher.fetchMatchingReactions(attachment.filename)
      .then((result) => {
        this.setState({ matchingAnalyses: result.reactions, loading: false });
      }).catch((errorMessage) => {
        this.setState({ loading: false });
        console.log(errorMessage);
      });
  }

  toggleTooltip() {
    const { showTooltip } = this.state;
    const { elementType } = this.props;
    if (showTooltip === false && this.matchingAnalysesCount() === 0) {
      if (elementType === 'sample') {
        this.fetchMatchingSamples();
      } else if (elementType === 'reaction') {
        this.fetchMatchingReactions();
      } else {
        console.warn(`Unsupported element type: ${elementType}`);
      }
    }

    this.setState((prevState) => ({ ...prevState, showTooltip: !prevState.showTooltip }));
  }

  matchingAnalysesCount() {
    const { matchingAnalyses } = this.state;
    return (matchingAnalyses && matchingAnalyses.length) || 0;
  }

  removeAttachment() {
    const { attachment, sourceType } = this.props;

    switch (sourceType) {
      case DragDropItemTypes.DATA:
        InboxActions.removeAttachmentFromList(attachment);
        break;
      case DragDropItemTypes.UNLINKED_DATA:
        InboxActions.removeUnlinkedAttachmentFromList(attachment);
        break;
      default:
        return false;
    }

    return true;
  }

  moveToAnalysis(elementId, attachmentId, variation) {
    const { elementType } = this.props;
    if (elementType === 'sample') {
      InboxFetcher.assignToSampleAnalysis(elementId, attachmentId)
        .then(() => {
          this.removeAttachment();
        }).catch((errorMessage) => {
          this.setState({ loading: false });
          console.log(errorMessage);
        });
    }
    if (elementType === 'reaction') {
      InboxFetcher.assignToReactionAnalysis(elementId, attachmentId, variation)
        .then(() => {
          this.removeAttachment();
        }).catch((errorMessage) => {
          this.setState({ loading: false });
          console.log(errorMessage);
        });
    }
    this.toggleTooltip();
  }

  renderAnalysesButtons() {
    const { loading, matchingAnalyses } = this.state;
    const { attachment, elementType } = this.props;
    const elementString = `${elementType.charAt(0).toUpperCase() + elementType.slice(1)}`;

    if (this.matchingAnalysesCount() === 0) {
      if (loading === true) {
        return (
          <div>
            <i className="fa fa-refresh fa-spin" />
            &nbsp;loading...
            <br />
          </div>
        );
      }
      return (
        <div>
          { `No matching ${elementString}s found.` }
          <br />
        </div>
      );
    }

    return (
      <div>
        {`Move to ${elementString}:`}
        <br />
        {matchingAnalyses.map((element) => (
          this.renderMoveButton(attachment, element)
        ))}
      </div>
    );
  }

  renderMoveButton(attachment, element) {
    return (
      <div style={{ textAlign: 'left' }} key={`btn_${element.id}`}>
        <Button
          variant="success"
          size="sm"
          onClick={() => this.moveToAnalysis(element.id, attachment.id, element.variation)}
        >
          <i className="fa fa-arrow-circle-right gap-1" aria-hidden="true" />
          {[
            element.short_label,
            element.name,
            element.type,
            element.variation && `V${element.variation}`,
          ].filter(Boolean).join(' ')}
        </Button>
        <br />
      </div>
    );
  }

  render() {
    const { showTooltip } = this.state;
    const { elementType } = this.props;

    const abortButton = (
      <Button
        variant="warning"
        size="xsm"
        onClick={() => this.toggleTooltip()}
      >
        <i className="fa fa-times-circle gap-1" aria-hidden="true" />
        Abort
      </Button>
    );

    return (
      <OverlayTrigger
        show={showTooltip}
        animation
        trigger="click"
        placement="bottom"
        overlay={(
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            {this.renderAnalysesButtons()}
            {abortButton}
          </Tooltip>
        )}
      >
        <i
          className={`icon-${elementType}`}
          onClick={() => this.toggleTooltip()}
          role="button"
          tabIndex="-1"
          label={`move-to-${elementType}`}
        />
      </OverlayTrigger>
    );
  }
}

MoveToAnalysisButton.propTypes = {
  attachment: PropTypes.shape({
    id: PropTypes.number.isRequired,
    filename: PropTypes.string.isRequired,
  }).isRequired,
  sourceType: PropTypes.string,
  elementType: PropTypes.string.isRequired,
};

MoveToAnalysisButton.defaultProps = {
  sourceType: ''
};
