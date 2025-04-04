/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';

import UIStore from 'src/stores/alt/stores/UIStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import { elementShowOrNew } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

import { reactionStatus, reactionRole } from 'src/apps/mydb/elements/list/ElementsTableEntries';
import CommentIcon from 'src/components/comments/CommentIcon';
import { ShowUserLabels } from 'src/components/UserLabels';
import ChevronIcon from 'src/components/common/ChevronIcon';
import Aviator from 'aviator';

const dragColumn = (element) => (
  <td className="text-center align-middle">
    <ElementDragHandle element={element} />
  </td>
);

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Group</Tooltip>;

function ReactionsHeader({
  group, element, show, onClick
}) {
  const { showPreviews } = UIStore.getState();

  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      <td colSpan="2" className="position-relative">
        {showPreviews && (
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
        )}
        <div className="position-absolute top-0 end-0 mt-2 me-2">
          <OverlayTrigger placement="bottom" overlay={overlayToggle}>
            <ChevronIcon direction={show ? 'down' : 'right'} color="primary"/>
          </OverlayTrigger>
        </div>
      </td>
      {dragColumn(element)}
    </tr>
  );
}

ReactionsHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  show: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function GenericElementsHeader({
  group, element, show, onClick
}) {
  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      <td colSpan="2" className="position-relative">
        <div className="preview-table">
          {group}
        </div>
        <div className="position-absolute top-0 end-0 mt-2 me-2">
          <OverlayTrigger placement="bottom" overlay={overlayToggle}>
            <span style={{ color: '#337ab7' }}>
              <ChevronIcon direction={show ? 'down' : 'right'} />
            </span>
          </OverlayTrigger>
        </div>
      </td>
      {dragColumn(element)}
    </tr>
  );
}

GenericElementsHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  show: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default class ElementsTableGroupedEntries extends Component {
  constructor() {
    super();

    this.state = {
      keyboardIndex: null,
      keyboardSelectedElementId: null,
      sortedElementIds: [],
    };
  }

  componentDidMount() {
    KeyboardStore.listen(this.reactionsOnKeyDown);
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.reactionsOnKeyDown);
  }

  getReactionGroupKey(element) {
    const { elementsGroup } = this.props;
    return element[elementsGroup];
  }

  getGenericGroupKey(element) {
    const { elementsGroup } = this.props;
    const groupElements = elementsGroup.split('.');
    const layer = groupElements[0];
    const field = groupElements[1];

    const { fields } = (element.properties.layers[layer] || { fields: [{ field, value: '' }] });
    return fields.find((f) => f.field === field)?.value || '[empty]';
  }

  reactionsOnKeyDown = (state) => {
    const { context } = state;
    if (context !== 'reaction') { return false; }

    const { documentKeyDownCode } = state;
    const { sortedElementIds } = this.state;
    let { keyboardIndex, keyboardSelectedElementId } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSelectedElementId != null) {
          this.showDetails(keyboardSelectedElementId);
        }
        break;
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex -= 1;
        } else {
          keyboardIndex = 0;
        }
        break;
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0;
        } else if (keyboardIndex < (sortedElementIds.length - 1)) {
          keyboardIndex += 1;
        }
        break;
      default:
        break;
    }

    keyboardSelectedElementId = sortedElementIds[keyboardIndex];
    this.setState({ keyboardIndex, keyboardSelectedElementId });

    return null;
  };

  showDetails(id) {
    const { currentCollection, isSync } = UIStore.getState();
    const { type, genericEl } = this.props;

    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;

    if (genericEl) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
  }

  groupedElements() {
    const { elements, type } = this.props;

    const groupedElements = {};

    const getKey = (type === 'reaction')
      ? (element) => this.getReactionGroupKey(element)
      : (element) => this.getGenericGroupKey(element);

    elements.forEach((element) => {
      const key = getKey(element);

      if (!Object.prototype.hasOwnProperty.call(groupedElements, key)) {
        groupedElements[key] = [];
      }

      groupedElements[key].push(element);
    });

    const sortedElementIds = [];
    Object.entries(groupedElements).forEach((entry) => {
      entry[1].forEach((element) => {
        sortedElementIds.push(element.id);
      });
    });

    // you are not able to use this.setState because this would rerender it again and again ...
    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.sortedElementIds = sortedElementIds;

    return groupedElements;
  }

  renderReactionElements(elements) {
    const { keyboardSelectedElementId } = this.state;
    const { isElementSelected } = this.props;

    const rows = elements.map((element) => {
      const selected = isElementSelected(element);
      const style = (selected || keyboardSelectedElementId === element.id) ? {
        color: '#fff', background: '#337ab7'
      } : {};

      return (
        <tr key={element.id} style={style}>
          <td width="30px">
            <ElementCheckbox element={element} />
          </td>
          <td
            role="gridcell"
            style={{ cursor: 'pointer' }}
            onClick={() => this.showDetails(element.id)}
          >
            <div className="d-flex gap-2">
              <SvgWithPopover
                hasPop
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
              <div className="d-flex gap-1 align-items-center">
                {reactionStatus(element)}
                {reactionRole(element)}
                <ShowUserLabels element={element} />
              </div>
              <CommentIcon commentCount={element.comment_count} />
              <ElementCollectionLabels element={element} key={element.id} />
            </div>
          </td>
          {dragColumn(element)}
        </tr>
      );
    });

    return rows;
  }

  renderGenericElements(elements) {
    const { keyboardSelectedElementId } = this.state;
    const { isElementSelected } = this.props;

    const rows = elements.map((element) => {
      const selected = isElementSelected(element);
      const style = (selected || keyboardSelectedElementId === element.id) ? {
        color: '#fff', background: '#337ab7'
      } : {};

      return (
        <tr key={element.id} style={style}>
          <td width="30px">
            <ElementCheckbox element={element} />
          </td>
          <td
            role="gridcell"
            style={{ cursor: 'pointer' }}
            onClick={() => this.showDetails(element.id)}
          >
            <div className="d-flex gap-2">
              <div className="preview-table">
                {element.title()}
              </div>
              <ShowUserLabels element={element} />
              <ElementCollectionLabels element={element} key={element.id} />
            </div>
          </td>
          {dragColumn(element)}
        </tr>
      );
    });

    return rows;
  }

  renderGroup(group, elements, index) {
    const { isGroupCollapsed, toggleGroupCollapse, type } = this.props;
    const showGroup = !isGroupCollapsed(group);

    let groupedElements;
    let groupHeader;

    if (type === 'reaction') {
      groupedElements = this.renderReactionElements(elements);
      groupHeader = (
        <ReactionsHeader
          group={group}
          element={elements[0]}
          show={showGroup}
          onClick={() => toggleGroupCollapse(group)}
        />
      );
    } else {
      groupedElements = this.renderGenericElements(elements);
      groupHeader = (
        <GenericElementsHeader
          group={group}
          element={elements[0]}
          show={showGroup}
          onClick={() => toggleGroupCollapse(group)}
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
    const tableContent = Object.entries(this.groupedElements()).map(
      (entry, index) => (this.renderGroup(entry[0], entry[1], index))
    );

    return (
      <Table>
        {tableContent}
      </Table>
    );
  }
}

ElementsTableGroupedEntries.defaultProps = {
  genericEl: null,
};

ElementsTableGroupedEntries.propTypes = {
  elements: PropTypes.array.isRequired,
  isElementSelected: PropTypes.func.isRequired,
  elementsGroup: PropTypes.string.isRequired,
  isGroupCollapsed: PropTypes.func.isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
  genericEl: PropTypes.object,
  type: PropTypes.string.isRequired,
};
