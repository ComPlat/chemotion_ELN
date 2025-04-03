import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import {
  Tooltip, OverlayTrigger, Badge
} from 'react-bootstrap';
import classnames from 'classnames';

import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';

import UIStore from 'src/stores/alt/stores/UIStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import { elementShowOrNew } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import UserStore from 'src/stores/alt/stores/UserStore';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import PropTypes from 'prop-types';
import Aviator from 'aviator';

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

function showDetails(element) {
  const { currentCollection, isSync } = UIStore.getState();
  const { id, type } = element;
  const uri = isSync
    ? `/scollection/${currentCollection.id}/${type}/${id}`
    : `/collection/${currentCollection.id}/${type}/${id}`;
  Aviator.navigate(uri, { silent: true });
  const e = { type, params: { collectionID: currentCollection.id } };
  e.params[`${type}ID`] = id;

  const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
  if (genericEls.find((el) => el.name === type)) {
    e.klassType = 'GenericEl';
  }

  elementShowOrNew(e);

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
      keyboardElementIndex: null
    };

    this.entriesOnKeyDown = this.entriesOnKeyDown.bind(this);
  }

  componentDidMount() {
    KeyboardStore.listen(this.entriesOnKeyDown);
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.entriesOnKeyDown);
  }

  entriesOnKeyDown(state) {
    const { context } = state;
    const { elements } = this.props;

    if (elements[0] == null || context !== elements[0].type) return false;

    const { documentKeyDownCode } = state;
    let { keyboardElementIndex } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardElementIndex && elements[keyboardElementIndex]) {
          showDetails(elements[keyboardElementIndex]);
        }
        break;
      case 38: // Up
        if (keyboardElementIndex > 0) {
          keyboardElementIndex -= 1;
        } else {
          keyboardElementIndex = 0;
        }
        break;
      case 40: // Down
        if (keyboardElementIndex == null) {
          keyboardElementIndex = 0;
        } else if (keyboardElementIndex < elements.length - 1) {
          keyboardElementIndex += 1;
        }
        break;
      default:
    }
    this.setState({ keyboardElementIndex });

    return null;
  }

  isElementChecked(element) {
    const { ui: { checkedIds = [], uncheckedIds = [], checkedAll } } = this.props;
    return (checkedAll && !uncheckedIds.includes(element.id)) || checkedIds.includes(element.id);
  }

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  previewColumn(element) {
    const classNames = classnames({
      reaction: element.type === 'reaction',
      research_plan: element.type === 'research_plan',
    });

    const { showPreviews } = UIStore.getState();
    if (showPreviews && (element.type === 'reaction')) {
      return (
        <button type="button" className="svg-container-button" onClick={() => showDetails(element)}>
          <SVG src={element.svgPath} className={classNames} key={element.svgPath} />
        </button>
      );
    }
    if (element.type === 'research_plan' || element.element_klass) {
      if (element.thumb_svg !== 'not available') {
        return (
          <button type="button" className="svg-container-button" onClick={() => showDetails(element)}>
            <img src={`data:image/png;base64,${element.thumb_svg}`} alt="" role="button" />
          </button>
        );
      }
      return (
        <button
          type="button"
          aria-label="Element"
          className="svg-container-button"
          onClick={() => showDetails(element)}
        />
      );
    }

    return (
      <button
        type="button"
        aria-label="Element"
        className="neutral-button"
        onClick={() => showDetails(element)}
      />
    );
  }

  render() {
    const { elements } = this.props;
    const { keyboardElementIndex } = this.state;

    return (
      <div className="elements">
        {elements.map((element, index) => {
          const isSelected = this.isElementSelected(element)
            || (keyboardElementIndex != null && keyboardElementIndex === index);
          return (
            <div className={classnames('d-flex', { 'text-bg-primary': isSelected })} key={element.id}>
              <ElementDragHandle element={element} />
              <ElementCheckbox
                element={element}
                key={element.id}
                checked={this.isElementChecked(element)}
              />
              <button
                type="button"
                onClick={() => showDetails(element)}
                className="neutral-button"
                width={element.type === 'research_plan' ? '280px' : 'unset'}
                data-cy={`researchPLanItem-${element.id}`}
              >
                <div>
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
              </button>
              {this.previewColumn(element)}
            </div>
          );
        })}
      </div>
    );
  }
}

ElementsTableEntries.defaultProps = {
  currentElement: null
};

/* eslint-disable react/forbid-prop-types */
ElementsTableEntries.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
  ui: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
};
