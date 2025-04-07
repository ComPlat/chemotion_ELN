/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';

import UIStore from 'src/stores/alt/stores/UIStore';

import { reactionStatus, reactionRole } from 'src/apps/mydb/elements/list/ElementsTableEntries';
import CommentIcon from 'src/components/comments/CommentIcon';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';

function ReactionsHeader({
  group, element, onClick
}) {
  const { showPreviews } = UIStore.getState();

  return (
    <div
      onClick={onClick}
      role="button"
    >
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
    </div>
  );
}

ReactionsHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

function GenericElementsHeader({
  group, onClick
}) {
  return (
    <div onClick={onClick}>
      <td colSpan="2" className="position-relative">
        <div className="preview-table">
          {group}
        </div>
      </td>
    </div>
  );
}

GenericElementsHeader.propTypes = {
  group: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default class ElementsTableGroupedEntries extends Component {
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

  renderReactionElement(element, showDetails) {
    return (
      <div
        onClick={showDetails}
        role="button"
        className="d-flex gap-2"
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
      </div>
    );
  }

  renderGenericElement(element, showDetails) {
    return (
      <div
        role="button"
        onClick={showDetails}
        className="d-flex gap-2"
      >
        <div className="preview-table">
          {element.title()}
        </div>
        <ShowUserLabels element={element} />
        <ElementCollectionLabels element={element} />
      </div>
    );
  }

  render() {
    const {
      elements,
      type,
      isGroupCollapsed,
      toggleGroupCollapse
    } = this.props;

    if (type === 'reaction') {
      return (
        <ElementGroupsRenderer
          elements={elements}
          getGroupKey={(element) => this.getReactionGroupKey(element)}
          isGroupCollapsed={isGroupCollapsed}
          toggleGroupCollapse={toggleGroupCollapse}
          renderGroupHeader={(group) => {
            const groupKey = this.getReactionGroupKey(group[0]);
            return (
              <ReactionsHeader
                group={groupKey}
                element={group[0]}
                onClick={() => toggleGroupCollapse(groupKey)}
              />
            );
          }}
          renderGroupItem={(item, showDetails) => this.renderReactionElement(item, showDetails)}
        />
      );
    }

    return (
      <ElementGroupsRenderer
        elements={elements}
        getGroupKey={(element) => this.getGenericGroupKey(element)}
        isGroupCollapsed={isGroupCollapsed}
        toggleGroupCollapse={toggleGroupCollapse}
        renderGroupHeader={(group) => {
          const groupKey = this.getGenericGroupKey(group[0]);
          return (
            <GenericElementsHeader
              group={groupKey}
              onClick={() => toggleGroupCollapse(groupKey)}
            />
          );
        }}
        renderGroupItem={(item, showDetails) => this.renderGenericElement(item, showDetails)}
      />
    );
  }
}

ElementsTableGroupedEntries.propTypes = {
  elements: PropTypes.array.isRequired,
  elementsGroup: PropTypes.string.isRequired,
  isGroupCollapsed: PropTypes.func.isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};
