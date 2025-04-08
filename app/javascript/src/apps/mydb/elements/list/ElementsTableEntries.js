import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import {
  Tooltip, OverlayTrigger, Badge
} from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

import ElementListRenderer from 'src/apps/mydb/elements/list/renderers/ElementListRenderer';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import PropTypes from 'prop-types';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';

export function reactionRole(element) {
  let tooltip = null;
  if (element.type === 'reaction') {
    switch (element.role) {
      case 'gp':
        tooltip = <Tooltip id="roleTp">General Procedure</Tooltip>;
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <i className="fa fa-home c-bs-primary me-1" />
          </OverlayTrigger>
        );
      case 'parts':
        tooltip = <Tooltip id="roleTp">Parts of General Procedure</Tooltip>;
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <i className="fa fa-bookmark c-bs-success me-1" />
          </OverlayTrigger>
        );
      case 'single':
        tooltip = <Tooltip id="roleTp">Single</Tooltip>;
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <i className="fa fa-asterisk c-bs-danger me-1" />
          </OverlayTrigger>
        );
      default:
    }
  }

  return null;
}

function reactionVariations(element) {
  if (element.type === 'reaction' && element.variations && element.variations.length) {
    return (
      <Badge bg="info">{`${element.variations.length} variation(s)`}</Badge>
    );
  }
  return null;
}

export function reactionStatus(element) {
  if (element.type === 'reaction' && element.status) {
    const tooltip = (
      <Tooltip id={`reaction_${element.status}`}>
        {element.status}
        &nbsp;
        Reaction
      </Tooltip>
    );

    const overlay = (_icons) => (
      <OverlayTrigger placement="top" overlay={tooltip}>
        {_icons}
      </OverlayTrigger>
    );

    switch (element.status) {
      case 'Planned':
        return overlay(<i className="fa fa-clock-o c-bs-warning" />);
      case 'Running': {
        const icon = (
          <span
            style={{ width: '12px', height: '14px', lineHeight: '14px' }}
            className="fa fa-stack"
          >
            <i className="fa fa-stack-1x fa-hourglass-1 running-1 c-bs-warning" />
            <i className="fa fa-stack-1x fa-hourglass-2 running-2 c-bs-warning" />
            <i className="fa fa-stack-1x fa-hourglass-3 running-3 c-bs-warning" />
          </span>
        );
        return overlay(icon);
      }
      case 'Done':
        return overlay(<i className="fa fa-hourglass-3 c-bs-primary" />);
      case 'Analyses Pending':
        return overlay(<i className="fa fa-ellipsis-h c-bs-primary" />);
      case 'Successful':
        return overlay(<i className="fa fa-check-circle-o c-bs-success" />);
      case 'Not Successful':
        return overlay(<i className="fa fa-times-circle-o c-bs-danger" />);
      default:
        return null;
    }
  }

  return null;
}

export default class ElementsTableEntries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showPreviews: UIStore.getState().showPreviews,
    };
  }

  componentDidMount() {
    UIStore.listen(this.onUiStoreChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUiStoreChange);
  }

  onUiStoreChange = (uiState) => {
    this.setState({
      showPreviews: uiState.showPreviews
    });
  };

  previewColumn(element, showDetails) {
    const { showPreviews } = this.state;

    const svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };

    if (showPreviews && (element.type === 'reaction')) {
      return (
        <div
          className="flex-grow-1"
          style={svgContainerStyle}
          onClick={showDetails}
        >
          <SVG src={element.svgPath} className="reaction" key={element.svgPath} />
        </div>
      );
    }
    if (element.type === 'research_plan' || element.element_klass) {
      if (element.thumb_svg !== 'not available') {
        return (
          <div
            className="flex-grow-1"
            style={svgContainerStyle}
            onClick={showDetails}
          >
            <img src={`data:image/png;base64,${element.thumb_svg}`} alt="" role="button" />
          </div>
        );
      }
    }

    return null;
  }

  renderElement(element, showDetails) {
    return (
      <div className="d-flex align-items-start">
        <div
          role="button"
          onClick={showDetails}
          style={{ cursor: 'pointer' }}
          width={element.type === 'research_plan' ? '280px' : 'unset'}
          data-cy={`researchPLanItem-${element.id}`}
          className="flex-grow-1"
        >
          <SvgWithPopover
            hasPop={['reaction'].includes(element.type)}
            previewObject={{
              txtOnly: element.title(),
              isSVG: true,
              src: element.svgPath
            }}
            popObject={{
              title: (element.type === 'reaction' && element.short_label) || '',
              src: element.svgPath,
              height: '26vh',
              width: '52vw'
            }}
          />
          {reactionStatus(element)}
          {reactionRole(element)}
          <ShowUserLabels element={element} />
          {reactionVariations(element)}
          <br />
          <CommentIcon commentCount={element.comment_count} />
          <ElementCollectionLabels element={element} key={element.id} />
        </div>
        {this.previewColumn(element, showDetails)}
      </div>
    );
  }

  render() {
    const { elements } = this.props;

    return (
      <ElementListRenderer
        elements={elements}
        renderItem={(element, showDetails) => this.renderElement(element, showDetails)}
      />
    );
  }
}

/* eslint-disable react/forbid-prop-types */
ElementsTableEntries.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
};
