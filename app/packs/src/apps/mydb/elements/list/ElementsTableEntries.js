import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import { Tooltip, OverlayTrigger, Table } from 'react-bootstrap';
import classnames from 'classnames';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';

import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { elementShowOrNew, AviatorNavigation } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import UserStore from 'src/stores/alt/stores/UserStore';
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
            <i className="fa fa-home c-bs-primary" />
          </OverlayTrigger>
        );
      case 'parts':
        tooltip = <Tooltip id="roleTp">Parts of General Procedure</Tooltip>;
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <i className="fa fa-bookmark c-bs-success" />
          </OverlayTrigger>
        );
      case 'single':
        tooltip = <Tooltip id="roleTp">Single</Tooltip>;
        return (
          <OverlayTrigger placement="top" overlay={tooltip}>
            <i className="fa fa-asterisk c-bs-danger" />
          </OverlayTrigger>
        );
      default:
    }
  }

  return null;
}

function showDetails(element) {
  const { id, type } = element;
  AviatorNavigation({ element, silent: true });
  const e = { type, params: {} };
  e.params[`${type}ID`] = id;
  const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
  if (genericEls.find((el) => el.name === type)) {
    e.klassType = 'GenericEl';
  }
  elementShowOrNew(e);
}

function sampleAnalysesLabels(element) {
  if (element.type === 'sample') {
    return (
      <ElementAnalysesLabels element={element} key={`${element.id}_analyses`} />
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

    let icon = null;
    switch (element.status) {
      case 'Planned':
        icon = <i className="fa fa-clock-o c-bs-warning" />;
        break;
      case 'Running':
        icon = (
          <span
            style={{ width: '12px', height: '14px', lineHeight: '14px' }}
            className="fa fa-stack"
          >
            <i className="fa fa-stack-1x fa-hourglass-1 running-1 c-bs-warning" />
            <i className="fa fa-stack-1x fa-hourglass-2 running-2 c-bs-warning" />
            <i className="fa fa-stack-1x fa-hourglass-3 running-3 c-bs-warning" />
          </span>
        );
        break;
      case 'Done':
        icon = <i className="fa fa-hourglass-3 c-bs-primary" />;
        break;
      case 'Analyses Pending':
        icon = <i className="fa fa-ellipsis-h c-bs-primary" />;
        break;
      case 'Successful':
        icon = <i className="fa fa-check-circle-o c-bs-success" />;
        break;
      case 'Not Successful':
        icon = <i className="fa fa-times-circle-o c-bs-danger" />;
        break;
      default:
        break;
    }

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        {icon}
      </OverlayTrigger>
    );
  }

  return null;
}

function topSecretIcon(element) {
  if (element.type === 'sample' && element.is_top_secret === true) {
    const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
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
    const { ui } = this.props;
    const { checkedIds, uncheckedIds, checkedAll } = ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  // eslint-disable-next-line class-methods-use-this
  isCurrEleDropType(type) {
    const { currentElement } = ElementStore.getState();
    const targets = {
      sample: ['reaction', 'wellplate'],
      reaction: ['research_plan'],
      wellplate: ['screen', 'research_plan'],
      generalProcedure: ['reaction'],
      research_plan: ['screen']
    };
    return type && currentElement && targets[type].includes(currentElement.type);
  }

  showDetails(element) {
    const { id, type } = element;
    AviatorNavigation({ element, silent: true });
    const e = { type, params: { } };
    e.params[`${type}ID`] = id;

    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find(el => el.name == type)) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
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
    const isDropForSample = el.type === 'sample' && this.isCurrEleDropType('sample');
    const isDropForWellPlate = el.type === 'wellplate' && this.isCurrEleDropType('wellplate');
    const isDropForResearchPlan = el.type === 'reaction' && this.isCurrEleDropType('reaction');
    const isDropForGP = el.type === 'reaction' && el.role === 'gp' && this.isCurrEleDropType('generalProcedure');
    const isDropForScreen = el.type === 'research_plan' && this.isCurrEleDropType('research_plan');

    if (isDropForSample) {
      sourceType = DragDropItemTypes.SAMPLE;
    } else if (isDropForWellPlate) {
      sourceType = DragDropItemTypes.WELLPLATE;
    } else if (isDropForResearchPlan) {
      sourceType = DragDropItemTypes.REACTION;
    } else if (isDropForGP) {
      sourceType = DragDropItemTypes.GENERALPROCEDURE;
    } else if (isDropForScreen) {
      sourceType = DragDropItemTypes.RESEARCH_PLAN;
    }
    return sourceType;
  }

  previewColumn(element) {
    const classNames = classnames(
      {
        molecule: element.type === 'sample'
      },
      {
        reaction: element.type === 'reaction'
      },
      {
        'molecule-selected': element.type === 'sample' && this.isElementSelected(element)
      },
      {
        reaction: element.type === 'reaction' && this.isElementSelected(element)
      },
      {
        research_plan: element.type === 'research_plan'
      }
    );

    const svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };

    const { showPreviews } = UIStore.getState();
    if (showPreviews && (element.type === 'reaction')) {
      return (
        <td role="gridcell" style={svgContainerStyle} onClick={() => showDetails(element)}>
          <SVG src={element.svgPath} className={classNames} key={element.svgPath} />
        </td>
      );
    }
    if (element.type === 'research_plan') {
      if (element.thumb_svg !== 'not available') {
        return (
          <td role="gridcell" style={svgContainerStyle} onClick={() => showDetails(element)}>
            <img src={`data:image/png;base64,${element.thumb_svg}`} alt="" style={{ cursor: 'pointer' }} />
          </td>
        );
      }
      return (
        <td
          role="gridcell"
          aria-label="Element"
          style={svgContainerStyle}
          onClick={() => showDetails(element)}
        />
      );
    }

    return (
      <td
        role="gridcell"
        aria-label="Element"
        style={{ display: 'none', cursor: 'pointer' }}
        onClick={() => showDetails(element)}
      />
    );
  }

  dragColumn(element) {
    const { showDragColumn } = this.props;
    if (showDragColumn) {
      return (
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
          {this.dragHandle(element)}
        </td>
      );
    }
    return <td style={{ display: 'none' }} />;
  }

  render() {
    const { elements } = this.props;
    const { keyboardElementIndex } = this.state;

    return (
      <Table className="elements" bordered hover style={{ borderTop: 0 }}>
        <tbody>
          {elements.map((element, index) => {
            const sampleMoleculeName = (element.type === 'sample') ? element.molecule.iupac_name : '';
            let style = {};
            if (this.isElementSelected(element)
              || (keyboardElementIndex != null && keyboardElementIndex === index)) {
              style = {
                color: '#000',
                background: '#ddd',
                border: '4px solid #337ab7'
              };
            }

            return (
              <tr key={element.id} style={style}>
                <td width="30px">
                  <ElementCheckbox
                    element={element}
                    key={element.id}
                    checked={this.isElementChecked(element)}
                  />
                  <br />
                </td>
                <td
                  role="gridcell"
                  onClick={() => showDetails(element)}
                  style={{ cursor: 'pointer' }}
                  width={element.type === 'research_plan' ? '280px' : 'unset'}
                  data-cy={"researchPLanItem-"+ element.id}
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
                    <br />
                    {sampleMoleculeName}
                    <CommentIcon commentCount={element.comment_count} />
                    <ElementCollectionLabels element={element} key={element.id} />
                    {sampleAnalysesLabels(element)}
                    {topSecretIcon(element)}
                  </div>
                </td>
                {this.previewColumn(element)}
                {this.dragColumn(element)}
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
}

ElementsTableEntries.defaultProps = {
  currentElement: null
};

/* eslint-disable react/forbid-prop-types */
ElementsTableEntries.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  ui: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
};
