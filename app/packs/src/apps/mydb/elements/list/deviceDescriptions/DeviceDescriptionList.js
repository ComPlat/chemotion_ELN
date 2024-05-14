import React, { useState, useContext } from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';
import CommentIcon from 'src/components/comments/CommentIcon';
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
      <td className="list-drag-handle">
        {dragHandle(element)}
      </td>
    );
  }

  const toggleShownGroup = (key, shownGroup) => {
    if (shownGroup === undefined) {
      deviceDescriptionsStore.addGroupToShownGroups(key);
    } else {
      deviceDescriptionsStore.removeGroupFromShownGroups(key);
    }
  }

  const groupedElements = () => {
    let group = {};

    elements.forEach((element) => {
      let key = element[groupedByValue];

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
      const identifierKey = key === "" ? '[empty]' : key;
      const shownGroup = deviceDescriptionsStore.shownGroups.find((g) => g === identifierKey);

      items.push(ListItemHeader(identifierKey, group, shownGroup));

      if (shownGroup === undefined && showAllGroups) {
        group.map((element, j) => {
          items.push(ListItem(element, j));
        });
      }
    });

    return items;
  }

  const ListItemHeader = (key, group, shownGroup) => {
    const icon = shownGroup === undefined && showAllGroups ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
    const groupKey = groupedByValue == 'short_label' ? group[0].short_label : key;
    const groupType = group[0].device_type ? `- ${group[0].device_type}` : '';
    const groupDeviceName = group[0].vendor_device_name ? group[0].vendor_device_name : group[0].name;
    const groupName = groupKey === '[empty]' ? groupKey : `${groupDeviceName} - ${groupKey} ${groupType}`;

    return (
      <tr
        onClick={() => toggleShownGroup(key, shownGroup)}
        key={`list-item-header-${key}`}
      >
        <td colSpan="3" className="grouped-list-header">
          <div className="grouped-list-header-name">
            <div className="preview-table">
              {groupName}
            </div>
          </div>
          <div className="grouped-list-header-toggle-icon">
            <OverlayTrigger placement="bottom" overlay={overlayToggle}>
              <span><i className={`glyphicon ${icon}`} /></span>
            </OverlayTrigger>
          </div>
        </td>
      </tr>
    );
  }

  const ListItem = (element, index) => {
    let className = '';
    if (isElementSelected(element)) {
      className = 'selected';
    }

    return (
      <tr key={element.id} className={`grouped-list-item ${className}`}>
        <td>
          <ElementCheckbox
            element={element}
            key={element.id}
            checked={isElementChecked(element)}
          />
          <br />
        </td>
        <td
          role="gridcell"
          onClick={() => showDetails(element)}
        >
          <div className="grouped-list-item-title-and-icons">
            <div>{element.title()}</div>
            <div>
              <CommentIcon commentCount={element.comment_count} />
              <ElementCollectionLabels element={element} key={element.id} />
            </div>
          </div>
        </td>
        {dragColumn(element)}
      </tr>
    );
  }

  return (
    <Table className="device-description-list" key="device-description-grouped-list">
      <tbody>
        {listItems()}
      </tbody>
    </Table>
  );
}

export default observer(DeviceDescriptionList);
