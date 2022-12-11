import React, { Component } from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';

import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

import { reactionStatus, reactionRole } from "src/apps/mydb/elements/list/ElementsTableEntries";

const dragHandle = (element) => {
  const { currentElement } = ElementStore.getState();

  let sourceType = '';

  if (element.type === 'reaction' && currentElement && 'research_plan' === currentElement.type) {
    sourceType = DragDropItemTypes.REACTION;
  }

  return (
    <ElementContainer
      key={element.id}
      sourceType={sourceType}
      element={element}
    />
  );
}

const dragColumn = (element, showDragColumn) => {
  if (showDragColumn) {
    return (
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
        {dragHandle(element)}
      </td>
    );
  } else {
    return <td style={{ display: 'none' }}></td>;
  }
}

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Group</Tooltip>;

const svgPreview = (showPreviews, group, element) => {
  if (showPreviews) {
    return (
      <div style={{ float: 'left' }} >
        <SvgWithPopover
          hasPop
          previewObject={{
            txtOnly: '',
            isSVG: true,
            className: 'reaction-header',
            src: element.svgPath
          }}
          popObject={{
            title: group,
            src: element.svgPath,
            height: '26vh',
            width: '52vw',
          }}
        />
      </div>
    );
  } else {
    return null;
  }
}

const ReactionsHeader = ({ group, element, show, showDragColumn, onClick }) => {
  const showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
  const { showPreviews } = UIStore.getState();

  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      <td colSpan="2" style={{ position: 'relative' }} >
        {svgPreview(showPreviews, group, element)}
        <div style={{ position: 'absolute', right: '3px', top: '14px' }} >
          <OverlayTrigger placement="bottom" overlay={overlayToggle} >
            <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }} >
              <i className={`glyphicon ${showIndicator}`} />
            </span>
          </OverlayTrigger>
        </div>
      </td>
      {dragColumn(element, showDragColumn)}
    </tr>
  );
}

const GenericElementsHeader = ({ group, element, show, showDragColumn, onClick }) => {
  const showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';

  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      <td colSpan="2" style={{ position: 'relative' }} >
        <div style={{ float: 'left' }} >
          <div className="preview-table">
            {group}
          </div>
        </div>
        <div style={{ position: 'absolute', right: '3px', top: '14px' }} >
          <OverlayTrigger placement="bottom" overlay={overlayToggle} >
            <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }} >
              <i className={`glyphicon ${showIndicator}`} />
            </span>
          </OverlayTrigger>
        </div>
      </td>
      {dragColumn(element, showDragColumn)}
    </tr>
  );
}

export default class ElementsTableGroupedEntries extends Component {
  constructor(props) {
    super();

    this.state = {
      elementsShown: [],
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSelectedElementId: null,
      sortedElementIds: [],
    };
  }

  updateTargetType() {
    const { currentElement } = ElementStore.getState();
    const targetType = currentElement && currentElement.type;
    this.state.targetType = targetType;
  }

  componentDidUpdate() {
    this.updateTargetType()
  }

  componentDidMount() {
    KeyboardStore.listen(this.reactionsOnKeyDown);
    this.updateTargetType()
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.reactionsOnKeyDown);
  }

  showDetails(id) {
    const { currentCollection, isSync } = UIStore.getState();
    const { type, genericEl } = this.props;

    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    let e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;

    if (genericEl) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e)
  }

  reactionsOnKeyDown = (state) => {
    const context = state.context;
    if (context != 'reaction') { return false; }

    const documentKeyDownCode = state.documentKeyDownCode;
    let { keyboardIndex, keyboardSelectedElementId, sortedElementIds } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSelectedElementId != null) {
          this.showDetails(keyboardSelectedElementId);
        }
        break;
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex--;
        } else {
          keyboardIndex = 0;
        }
        break;
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0;
        } else if (keyboardIndex < (sortedElementIds.length - 1)) {
          keyboardIndex++;
        }
        break;
      default:
        break;
    }

    keyboardSelectedElementId = sortedElementIds[keyboardIndex];
    this.setState({ keyboardIndex, keyboardSelectedElementId });
  }

  handleGroupToggle(group) {
    let { elementsShown } = this.state;

    if (elementsShown.includes(group)) {
      elementsShown = elementsShown.filter(item => item !== group);
    } else {
      elementsShown = elementsShown.concat(group);
    }

    this.setState({ elementsShown });
    this.props.onChangeCollapse(false);
  }

  isElementChecked(element) {
    const { checkedIds, uncheckedIds, checkedAll } = this.props.ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  renderReactionElements(elements) {
    const { keyboardSelectedElementId } = this.state;
    const { showDragColumn } = this.props;

    const rows = elements.map((element, index) => {
      const selected = this.isElementSelected(element);
      const style = (selected || keyboardSelectedElementId === element.id) ? {
        color: '#fff', background: '#337ab7'
      } : {};

      return (
        <tr key={index} style={style}>
          <td width="30px">
            <ElementCheckbox
              element={element}
              key={element.id}
              checked={this.isElementChecked(element)}
            />
          </td>
          <td
            style={{ cursor: 'pointer' }}
            onClick={e => this.showDetails(element.id)}
          >
            <div style={{
              display: "flex",
              gap: 8
            }}>
              {
                <SvgWithPopover
                  hasPop={true}
                  previewObject={{
                    txtOnly: element.title(),
                    isSVG: true,
                    src: element.svgPath
                  }}
                  popObject={{
                    title: element.short_label,
                    src: element.svgPath,
                    height: '26vh',
                    width: '52vw'
                  }}
                />
              }
              <div style={{
                alignItems: 'center',
                display: 'flex',
                gap: 5
              }}>
                {reactionStatus(element)}
                {reactionRole(element)}
              </div>
              <ElementCollectionLabels element={element} key={element.id} />
            </div>
          </td>
          {dragColumn(element, showDragColumn)}
        </tr>
      );
    });

    return rows;
  }

  renderGenericElements(elements) {
    const { keyboardSelectedElementId } = this.state;
    const { showDragColumn } = this.props;

    const rows = elements.map((element, index) => {
      const selected = this.isElementSelected(element);
      const style = (selected || keyboardSelectedElementId === element.id) ? {
        color: '#fff', background: '#337ab7'
      } : {};

      return (
        <tr key={index} style={style}>
          <td width="30px">
            <ElementCheckbox
              element={element}
              key={element.id}
              checked={this.isElementChecked(element)}
            />
          </td>
          <td
            style={{ cursor: 'pointer' }}
            onClick={e => this.showDetails(element.id)}
          >
            <div style={{
              display: "flex",
              gap: 8
            }}>
              <div className="preview-table">
                {element.title()}
              </div>
              <ElementCollectionLabels element={element} key={element.id} />
            </div>
          </td>
          {dragColumn(element, showDragColumn)}
        </tr>
      );
    });

    return rows;
  }

  groupedElements() {
    const { elements, elementsGroup, type } = this.props;

    let groupedElements = {};

    if (type === 'reaction') {
      elements.forEach((element, _) => {
        const key = element[elementsGroup];

        if (!groupedElements.hasOwnProperty(key)) {
          groupedElements[key] = [];
        }

        groupedElements[key].push(element);
      });
    } else {
      const groupElements = elementsGroup.split('.');
      const layer = groupElements[0];
      const field = groupElements[1];

      elements.forEach((element, _) => {
        const fields = (element.properties.layers[layer] || { fields: [{ field: field, value: ''}] }).fields;
        const key = fields.find(f => f.field === field)?.value || '[empty]';

        if (!groupedElements.hasOwnProperty(key)) {
          groupedElements[key] = [];
        }

        groupedElements[key].push(element);
      });
    }

    let sortedElementIds = [];
    Object.entries(groupedElements).forEach((entry) => {
      entry[1].forEach((element) => {
        sortedElementIds.push(element.id);
      });
    });

    this.state.sortedElementIds = sortedElementIds;

    return groupedElements;
  }

  renderGroup(group, elements, index) {
    const { showDragColumn, collapseAll, type } = this.props;
    const { elementsShown, targetType } = this.state;

    const showGroup = !elementsShown.includes(group) && !collapseAll;
    let groupedElements;
    let groupHeader;

    if (type === 'reaction') {
      groupedElements = this.renderReactionElements(elements);
      groupHeader = (
        <ReactionsHeader
          group={group}
          element={elements[0]}
          show={showGroup}
          showDragColumn={showDragColumn}
          onClick={() => this.handleGroupToggle(group)}
          targetType={targetType}
        />
      );
    } else {
      groupedElements = this.renderGenericElements(elements);
      groupHeader = (
        <GenericElementsHeader
          group={group}
          element={elements[0]}
          show={showGroup}
          showDragColumn={showDragColumn}
          onClick={() => this.handleGroupToggle(group)}
          targetType={targetType}
        />
      );
    }

    return (
      <tbody key={index}>
        {groupHeader}
        {showGroup && groupedElements}
      </tbody>
    );
  }

  render() {
    const tableContent = Object.entries(this.groupedElements()).map((entry, index) => {
      return this.renderGroup(entry[0], entry[1], index);
    });

    return (
      <Table>
        {tableContent}
      </Table>
    );
  }
}

ElementsTableGroupedEntries.propTypes = {
  onChangeCollapse: PropTypes.func,
  collapseAll: PropTypes.bool,
  elements: PropTypes.array,
  currentElement: PropTypes.object,
  showDragColumn: PropTypes.bool,
  ui: PropTypes.object,
  elementsGroup: PropTypes.string,
  genericEl: PropTypes.object,
  type: PropTypes.string,
};
