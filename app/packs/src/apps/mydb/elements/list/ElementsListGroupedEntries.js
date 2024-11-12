/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';

import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import GenericGroupHeader from 'src/apps/mydb/elements/list/generic/GenericGroupHeader';
import GenericGroupElement from 'src/apps/mydb/elements/list/generic/GenericGroupElement';
import ReactionGroupHeader from 'src/apps/mydb/elements/list/reaction/ReactionGroupHeader';
import ReactionGroupElement from 'src/apps/mydb/elements/list/reaction/ReactionGroupElement';
import CellLineGroupHeader from 'src/apps/mydb/elements/list/cellLine/CellLineGroupHeader';
import CellLineGroupElement from 'src/apps/mydb/elements/list/cellLine/CellLineGroupElement';

export default class ElementsListGroupedEntries extends Component {
  constructor(props) {
    super(props);

    const { elementGroups } = props;
    const sortedElementIds = Object.values(elementGroups)
      .flatMap((elements) => elements.map(({ id }) => id));

    this.state = {
      elementsShown: [],
      keyboardIndex: null,
      keyboardSelectedElementId: null,
      sortedElementIds: sortedElementIds,
    };
  }

  componentDidMount() {
    KeyboardStore.listen(this.reactionsOnKeyDown);
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.reactionsOnKeyDown);
  }

  componentDidUpdate(prevProps) {
    const { elementGroups } = this.props;
    const { elementGroups: prevElementGroups } = prevProps;

    if (elementGroups !== prevElementGroups) {
      const sortedElementIds = Object.values(elementGroups)
        .flatMap((elements) => elements.map(({ id }) => id));

      this.setState({ sortedElementIds });
    }
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

  renderGroup(group, elements, GroupHeader, GroupElement) {
    const {
      showDragColumn,
      collapseAll,
      showDetails,
    } = this.props;

    const { elementsShown, keyboardSelectedElementId } = this.state;
    const showGroup = !elementsShown.includes(group) && !collapseAll;

    return (
      <tbody key={`group-header-${group}`}>
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
    const { type, elementGroups } = this.props;
    let headerComponent, elementComponent;
    if (type === 'reaction') {
      headerComponent = ReactionGroupHeader;
      elementComponent = ReactionGroupElement;
    } else if (type == 'cell_line') {
      headerComponent = CellLineGroupHeader;
      elementComponent = CellLineGroupElement;
    } else {
      headerComponent = GenericGroupHeader;
      elementComponent = GenericGroupElement;
    }

    const tableContent = Object.entries(elementGroups).map(([key, elements]) =>
      this.renderGroup(key, elements, headerComponent, elementComponent)
    );

    return (
      <Table>
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
  elementGroups: PropTypes.array.isRequired,
  currentElement: PropTypes.object,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
  genericEl: PropTypes.object,
  type: PropTypes.string.isRequired,
};
