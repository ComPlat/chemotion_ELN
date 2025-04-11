/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';

import { ShowUserLabels } from 'src/components/UserLabels';

import ReactionGroupHeader from 'src/apps/mydb/elements/list/reaction/ReactionGroupHeader';
import ReactionGroupItem from 'src/apps/mydb/elements/list/reaction/ReactionGroupItem';

function GenericElementsHeader({
  group, onClick
}) {
  return (
    <div onClick={onClick} role="button">
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

function GenericElementItem({ element, showDetails }) {
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

GenericElementItem.propTypes = {
  element: PropTypes.object.isRequired,
  showDetails: PropTypes.func.isRequired,
};

export default function ElementsTableGroupedEntries({
  type,
  elements,
  elementsGroup,
}) {
  if (type === 'reaction') {
    const getGroupKey = (element) => element[elementsGroup];
    return (
      <ElementGroupsRenderer
        type="reaction"
        elements={elements}
        getGroupKey={(element) => getGroupKey(element)}
        renderGroupHeader={(group, toggleGroupCollapse) => {
          const groupKey = getGroupKey(group[0]);
          return (
            <ReactionGroupHeader
              group={groupKey}
              element={group[0]}
              onClick={() => toggleGroupCollapse()}
            />
          );
        }}
        renderGroupItem={(item, showDetails) => (
          <ReactionGroupItem element={item} showDetails={showDetails} />
        )}
      />
    );
  }

  const getGroupKey = (element) => {
    const groupElements = elementsGroup.split('.');
    const layer = groupElements[0];
    const field = groupElements[1];

    const { fields } = (element.properties.layers[layer] || { fields: [{ field, value: '' }] });
    return fields.find((f) => f.field === field)?.value || '[empty]';
  };

  return (
    <ElementGroupsRenderer
      type={type}
      elements={elements}
      getGroupKey={(element) => getGroupKey(element)}
      renderGroupHeader={(group, toggleGroupCollapse) => {
        const groupKey = getGroupKey(group[0]);
        return (
          <GenericElementsHeader
            group={groupKey}
            onClick={() => toggleGroupCollapse()}
          />
        );
      }}
      renderGroupItem={(item, showDetails) => (
        <GenericElementItem element={item} showDetails={showDetails} />
      )}
    />
  );
}

ElementsTableGroupedEntries.propTypes = {
  elements: PropTypes.array.isRequired,
  elementsGroup: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};
