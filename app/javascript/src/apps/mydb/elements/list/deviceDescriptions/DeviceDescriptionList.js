import React, { useContext } from 'react';
import { Tooltip, OverlayTrigger, Collapse } from 'react-bootstrap';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';
import CommentIcon from 'src/components/comments/CommentIcon';
import ChevronIcon from 'src/components/common/ChevronIcon';
import Aviator from 'aviator';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { elementShowOrNew } from 'src/utilities/routesUtils';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UIStore from 'src/stores/alt/stores/UIStore';

const DeviceDescriptionList = ({ elements, currentElement, ui }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;
  const showAllGroups = deviceDescriptionsStore.show_all_groups;
  const overlayToggle = <Tooltip id="toggle_molecule">Toggle Group</Tooltip>;

  const isElementSelected = (element) => {
    return (currentElement && currentElement.id === element.id);
  }

  const isElementChecked = (element) => {
    const { checkedIds, uncheckedIds, checkedAll } = ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  const showDetails = (element) => {
    const { currentCollection, isSync } = UIStore.getState();
    const { id, type } = element;
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/${id}`
      : `/collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;
    elementShowOrNew(e);

    return null;
  }

  const dragHandle = (element) => {
    const sourceType = DragDropItemTypes.DEVICE_DESCRIPTION;
    return (
      <ElementContainer
        key={element.id}
        sourceType={sourceType}
        element={element}
      />
    );
  }

  const dragColumn = (element) => {
    return (
      <div className="ms-3">
        {dragHandle(element)}
      </div>
    );
  }

  const toggleShownGroup = (key, shownGroup) => {
    if (shownGroup === undefined) {
      deviceDescriptionsStore.addGroupToShownGroups(key);
    } else {
      deviceDescriptionsStore.removeGroupFromShownGroups(key);
    }
  }

  const chevronOpenOrClosed = (shownGroup) => {
    return shownGroup === undefined && showAllGroups ? true : (shownGroup === undefined ? true : false);
  }

  const identifierKey = (key) => {
    return key === "" || key === undefined ? '[empty]' : key;
  }

  const groupedElements = () => {
    let group = {};

    elements.forEach((element) => {
      let key = element[groupedByValue];

      if (groupedByValue.includes('ontology') && element.ontologies) {
        const ontology = groupedByValue.split('.');
        const index = element.ontologies.findIndex((f) => f.data.label.toLowerCase().replaceAll(' ', '-') === ontology[1]);
        key = index >= 0 ? `${ontology[0].charAt(0).toUpperCase() + ontology[0].slice(1)} ${ontology[1]}` : '[other]';        
      }

      deviceDescriptionsStore.addGroupToAllGroups(identifierKey(key));

      if (groupedByValue == 'short_label') {
        key = element.ancestor_ids[0] || element.id;
      }

      if (!Object.prototype.hasOwnProperty.call(group, key)) {
        group[key] = [];
      }
      group[key].push(element);
    });

    return group;
  }

  const listItems = () => {
    let items = [];

    Object.entries(groupedElements()).forEach(([key, group]) => {
      const shownGroup = deviceDescriptionsStore.shownGroups.find((g) => g === identifierKey(key));
      items.push(
        <div key={identifierKey(key)}>
          {ListItemHeader(identifierKey(key), group, shownGroup)}
          <Collapse in={chevronOpenOrClosed(shownGroup)}>
            <div>
              {group.map((element) => ListItem(element))}
            </div>
          </Collapse>
        </div>
      );
    });

    return items;
  }

  const ListItemHeader = (key, group, shownGroup) => {
    const direction = chevronOpenOrClosed(shownGroup) ? 'down' : 'right';
    const groupKey = groupedByValue == 'short_label' ? group[0].short_label : key;
    const groupType = group[0].device_type ? `- ${group[0].device_type}` : '';
    const groupDeviceName = group[0].vendor_device_name ? group[0].vendor_device_name : group[0].name;
    let groupName = groupKey;
    if (groupKey !== '[empty]' && groupKey !== '[other]' && !key.includes('Ontology')) {
      groupName = `${groupDeviceName} - ${groupKey} ${groupType}`;
    }

    return (
      <div
        className="d-flex justify-content-between align-items-center bg-gray-100 p-3 border-bottom"
        onClick={() => toggleShownGroup(key, shownGroup)}
        key={`element-list-item-header-${key}`}
        role="button"
      >
        <div className="fw-bold fs-5">{groupName}</div>
        <div>
          <OverlayTrigger placement="bottom" overlay={overlayToggle}>
            <ChevronIcon
              direction={direction}
              color="primary"
              className="fs-5"
            />
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  const ListItem = (element) => {
    const selectedClass = isElementSelected(element) ? 'text-bg-primary' : '';
    return (
      <div
        className={`d-flex justify-content-between px-3 py-2 border-bottom ${selectedClass}`}
        key={`collapse-${element.id}`}
        onClick={() => showDetails(element)}
        role="button"
      >
        <div className="d-flex gap-3">
          <ElementCheckbox
            element={element}
            checked={isElementChecked(element)}
          />
          <div>{element.title()}</div>
        </div>
        <div className="d-flex gap-1">
          <CommentIcon commentCount={element.comment_count} />
          <ElementCollectionLabels element={element} key={element.id} />
          {dragColumn(element)}
        </div>
      </div>
    );
  }

  return (
    <div key="device-description-grouped-list">
      {listItems()}
    </div>
  );
}

export default observer(DeviceDescriptionList);
