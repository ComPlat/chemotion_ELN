import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import {
  Tooltip, OverlayTrigger, Table, Badge
} from 'react-bootstrap';
import classnames from 'classnames';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';

import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import { DragDropItemTypes } from 'src/utilities/DndConst';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import PropTypes from 'prop-types';

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

export default class ElementsListEntries extends Component {
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
    const { elements, showDetails } = this.props;

    if (elements[0] == null || context !== elements[0].type) return false;

    const { documentKeyDownCode } = state;
    let { keyboardElementIndex } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardElementIndex && elements[keyboardElementIndex]) {
          showDetails(elements[keyboardElementIndex].id);
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

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  // eslint-disable-next-line class-methods-use-this
  isCurrEleDropType(type) {
    const { currentElement } = ElementStore.getState();
    const targets = {
      reaction: ['research_plan'],
      wellplate: ['screen', 'research_plan'],
      generalProcedure: ['reaction'],
      research_plan: ['screen']
    };
    return type && currentElement && targets[type].includes(currentElement.type);
  }

  dragHandle(element) {
    const sourceType = this.dropSourceType(element);
    return (
      <ElementContainer
        key={element.id}
        sourceType={sourceType}
        element={element}
      />
    );
  }

  dropSourceType(el) {
    let sourceType = '';
    const isDropForWellPlate = el.type === 'wellplate' && this.isCurrEleDropType('wellplate');
    const isDropForResearchPlan = el.type === 'reaction' && this.isCurrEleDropType('reaction');
    const isDropForGP = el.type === 'reaction' && el.role === 'gp' && this.isCurrEleDropType('generalProcedure');
    const isDropForScreen = el.type === 'research_plan' && this.isCurrEleDropType('research_plan');

    if (isDropForWellPlate) {
      sourceType = DragDropItemTypes.WELLPLATE;
    } else if (isDropForResearchPlan) {
      sourceType = DragDropItemTypes.REACTION;
    } else if (isDropForGP) {
      sourceType = DragDropItemTypes.GENERALPROCEDURE;
    } else if (isDropForScreen) {
      sourceType = DragDropItemTypes.RESEARCH_PLAN;
    } else {
      sourceType = DragDropItemTypes.ELEMENT;
    }
    return sourceType;
  }

  previewColumn(element) {
    const { showDetails } = this.props;
    const classNames = classnames({
      reaction: element.type === 'reaction',
      research_plan: element.type === 'research_plan',
    });

    const svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };

    const { showPreviews } = UIStore.getState();
    if (showPreviews && (element.type === 'reaction')) {
      return (
        <td role="gridcell" style={svgContainerStyle} onClick={() => showDetails(element.id)}>
          <SVG src={element.svgPath} className={classNames} key={element.svgPath} />
        </td>
      );
    }
    if (element.type === 'research_plan' || element.element_klass) {
      if (element.thumb_svg !== 'not available') {
        return (
          <td role="gridcell" style={svgContainerStyle} onClick={() => showDetails(element.id)}>
            <img src={`data:image/png;base64,${element.thumb_svg}`} alt="" role="button" />
          </td>
        );
      }
      return (
        <td
          role="gridcell"
          aria-label="Element"
          style={svgContainerStyle}
          onClick={() => showDetails(element.id)}
        />
      );
    }

    return (
      <td
        role="gridcell"
        aria-label="Element"
        style={{ display: 'none', cursor: 'pointer' }}
        onClick={() => showDetails(element.id)}
      />
    );
  }

  render() {
    const { elements, showDragColumn, showDetails } = this.props;
    const { keyboardElementIndex } = this.state;

    return (
      <Table className="elements" hover>
        <tbody className="sheet">
          {elements.map((element, index) => {
            const className = classnames({
              'text-bg-primary': (this.isElementSelected(element)
                || (keyboardElementIndex != null && keyboardElementIndex === index))
            });

            return (
              <tr key={element.id} className={className}>
                <td width="30px">
                  <ElementCheckbox element={element} />
                </td>
                <td
                  role="gridcell"
                  onClick={() => showDetails(element.id)}
                  style={{ cursor: 'pointer' }}
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
                    {' '}
                    {reactionRole(element)}
                    <ShowUserLabels element={element} />
                    {reactionVariations(element)}
                    <br />
                    <CommentIcon commentCount={element.comment_count} />
                    <ElementCollectionLabels element={element} key={element.id} />
                  </div>
                </td>
                {this.previewColumn(element)}
                {showDragColumn && (
                  <td className="text-center align-middle">
                    {this.dragHandle(element)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
}

ElementsListEntries.defaultProps = {
  currentElement: null
};

/* eslint-disable react/forbid-prop-types */
ElementsListEntries.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  currentElement: PropTypes.object,
  showDetails: PropTypes.func.isRequired,
};
