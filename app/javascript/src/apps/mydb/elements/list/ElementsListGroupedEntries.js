/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';

import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import GenericGroupHeader from 'src/apps/mydb/elements/list/generic/GenericGroupHeader';
import GenericGroupElement from 'src/apps/mydb/elements/list/generic/GenericGroupElement';
import ReactionGroupHeader from 'src/apps/mydb/elements/list/reaction/ReactionGroupHeader';
import ReactionGroupElement from 'src/apps/mydb/elements/list/reaction/ReactionGroupElement';

export default class ElementsListGroupedEntries extends Component {
  constructor() {
    super();

    this.state = {
      elementsShown: [],
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

  handleGroupToggle(group) {
    let { elementsShown } = this.state;

    if (elementsShown.includes(group)) {
      elementsShown = elementsShown.filter((item) => item !== group);
    } else {
      elementsShown = elementsShown.concat(group);
    }

    this.setState({ elementsShown });
    const { onChangeCollapse } = this.props;
    onChangeCollapse(false);
  }

  reactionsOnKeyDown = (state) => {
    const { context } = state;
    if (context !== 'reaction') { return false; }

    const { showDetails } = this.props;
    const { documentKeyDownCode } = state;
    const { sortedElementIds } = this.state;
    let { keyboardIndex, keyboardSelectedElementId } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSelectedElementId != null) {
          showDetails(keyboardSelectedElementId);
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

  isElementSelected(element) {
    const { currentElement } = this.props;
    return currentElement?.id === element.id;
  }

  groupedElements() {
    const { elements, elementsGroup, type } = this.props;

    const groupedElements = {};

    if (type === 'reaction') {
      elements.forEach((element) => {
        const key = element[elementsGroup];

        if (!Object.prototype.hasOwnProperty.call(groupedElements, key)) {
          groupedElements[key] = [];
        }

        groupedElements[key].push(element);
      });
    } else {
      const groupElements = elementsGroup.split('.');
      const layer = groupElements[0];
      const field = groupElements[1];

      elements.forEach((element) => {
        const { fields } = (element.properties.layers[layer] || { fields: [{ field, value: '' }] });
        const key = fields.find((f) => f.field === field)?.value || '[empty]';

        if (!Object.prototype.hasOwnProperty.call(groupedElements, key)) {
          groupedElements[key] = [];
        }

        groupedElements[key].push(element);
      });
    }

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

  renderGroup(group, elements, GroupHeader, GroupElement) {
    const {
      showDragColumn,
      collapseAll,
      showDetails,
    } = this.props;

    const { elementsShown, keyboardSelectedElementId } = this.state;
    const showGroup = !elementsShown.includes(group) && !collapseAll;

    return (
      <tbody key={`group-header-${group}`} className="sheet">
        <GroupHeader
          group={group}
          element={elements[0]}
          show={showGroup}
          showDragColumn={showDragColumn}
          toggleGroup={() => this.handleGroupToggle(group)}
        />
        {showGroup && elements.map((element) => (
          <GroupElement
            key={element.id}
            element={element}
            isSelected={this.isElementSelected(element)}
            showDragColumn={showDragColumn}
            keyboardSelectedElementId={keyboardSelectedElementId}
            showDetails={showDetails}
          />
        ))}
      </tbody>
    );
  }

  render() {
    const { type } = this.props;
    let headerComponent;
    let elementComponent;
    if (type === 'reaction') {
      headerComponent = ReactionGroupHeader;
      elementComponent = ReactionGroupElement;
    } else {
      headerComponent = GenericGroupHeader;
      elementComponent = GenericGroupElement;
    }

    const tableContent = Object.entries(this.groupedElements()).map(
      (entry) => this.renderGroup(entry[0], entry[1], headerComponent, elementComponent)
    );

    return (
      <Table className="elements">
        {tableContent}
      </Table>
    );
  }
}

ElementsListGroupedEntries.defaultProps = {
  currentElement: null,
  genericEl: null,
};

ElementsListGroupedEntries.propTypes = {
  onChangeCollapse: PropTypes.func.isRequired,
  collapseAll: PropTypes.bool.isRequired,
  elements: PropTypes.array.isRequired,
  currentElement: PropTypes.object,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
  elementsGroup: PropTypes.string.isRequired,
  genericEl: PropTypes.object,
  type: PropTypes.string.isRequired,
};
