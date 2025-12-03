import React, { useContext, useCallback } from 'react';
import PropTypes from 'prop-types';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import DeviceDescription from 'src/models/DeviceDescription';

function ListItemHeader({
  group,
  getGroupKey,
  groupedByValue
}) {
  const groupKey = getGroupKey(group[0]);
  const groupType = group[0].device_type ? `- ${group[0].device_type}` : '';
  const groupDeviceName = group[0].vendor_device_name ? group[0].vendor_device_name : group[0].name;

  let groupName = groupedByValue === 'short_label' ? group[0].short_label : groupKey;
  if (groupKey !== '[empty]' && groupKey !== '[other]' && !groupedByValue.includes('ontology')) {
    groupName = `${groupDeviceName} - ${groupKey} ${groupType}`;
  } else if (groupKey === '[empty]') {
    const emptyType = groupedByValue.includes('ontology') ? 'ontology' : 'serial no';
    groupName = `[missing ${emptyType}]`;
  }

  return (
    <div className="fw-bold fs-5">{groupName}</div>
  );
}

ListItemHeader.propTypes = {
  group: PropTypes.arrayOf(PropTypes.instanceOf(DeviceDescription)).isRequired,
  getGroupKey: PropTypes.func.isRequired,
  groupedByValue: PropTypes.string.isRequired,
};

function ListItem({ element, showDetails }) {
  return (
    <div
      className="d-flex justify-content-between"
      onClick={showDetails}
      role="button"
    >
      <div className="d-flex gap-3">
        <div>{element.title()}</div>
      </div>
      <div className="d-flex gap-1">
        <CommentIcon commentCount={element.comment_count} />
        <ElementCollectionLabels element={element} />
      </div>
    </div>
  );
}

ListItem.propTypes = {
  element: PropTypes.instanceOf(DeviceDescription).isRequired,
  showDetails: PropTypes.func.isRequired,
};

function DeviceDescriptionList({
  elements,
}) {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;

  const getGroupKey = useCallback((element) => {
    const identifierKey = (key) => (key === undefined || key.length === 0 ? '[empty]' : key);

    switch (groupedByValue) {
      case 'ontology': {
        const keys = element?.ontologies ? element?.ontologies.map((ontology) => ontology?.data.label).join(' - ') : '';
        return identifierKey(keys);
      }
      case 'ontology_combined': {
        const keys = element?.ontologies ? element?.ontologies.map((ontology) => ontology?.data.label) : '';
        const sortedKeys = keys ? keys.sort().join(' - ') : '';
        return identifierKey(sortedKeys);
      }
      case 'short_label':
        return identifierKey(element.ancestor_ids[0] || element.id);
      default:
        return identifierKey(element[groupedByValue]);
    }
  }, [groupedByValue]);

  return (
    <ElementGroupsRenderer
      type="device_description"
      elements={elements}
      getGroupKey={getGroupKey}
      renderGroupHeader={(group) => (
        <ListItemHeader
          group={group}
          getGroupKey={getGroupKey}
          groupedByValue={groupedByValue}
        />
      )}
      renderGroupItem={(element, showDetails) => (
        <ListItem
          element={element}
          showDetails={showDetails}
        />
      )}
    />
  );
}

DeviceDescriptionList.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.instanceOf(DeviceDescription)).isRequired,
};

export default observer(DeviceDescriptionList);
