/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';

import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

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
      sortedElementIds,
    };
  }

  componentDidMount() {
    KeyboardStore.listen(this.onKeyDown);
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.onKeyDown);
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

  onKeyDown = (state) => {
    const { context } = state;
    if (context !== 'reaction' && context !== 'sample') { return false; }

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

  renderGroup(group, elements) {
    const {
      showDragColumn,
      collapseAll,
      showDetails,
      isElementSelected,
      headerComponent: GroupHeader,
      elementComponent: GroupElement
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
            isSelected={isElementSelected(element)}
            showDragColumn={showDragColumn}
            keyboardSelectedElementId={keyboardSelectedElementId}
            showDetails={showDetails}
          />
        ))}
      </tbody>
    );
  }

  render() {
    const { elementGroups } = this.props;

    return (
      <Table className="elements">
        {Object.keys(elementGroups).map((key) => this.renderGroup(key, elementGroups[key]))}
      </Table>
    );
  }
}

ElementsListGroupedEntries.propTypes = {
  onChangeCollapse: PropTypes.func.isRequired,
  collapseAll: PropTypes.bool.isRequired,
  elementGroups: PropTypes.array.isRequired,
  isElementSelected: PropTypes.func.isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
  headerComponent: PropTypes.node.isRequired,
  elementComponent: PropTypes.node.isRequired,
};
