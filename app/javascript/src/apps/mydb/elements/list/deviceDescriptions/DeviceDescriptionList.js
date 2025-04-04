import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, Collapse } from 'react-bootstrap';

import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';
import CommentIcon from 'src/components/comments/CommentIcon';
import ChevronIcon from 'src/components/common/ChevronIcon';
import Aviator from 'aviator';
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
      let key = identifierKey(element[groupedByValue]);

      if (groupedByValue === 'ontology' && element.ontologies.length >= 1) {
        element.ontologies.map((ontology) => {
          key = ontology.data.label;

          deviceDescriptionsStore.addGroupToAllGroups(key);

          if (!Object.prototype.hasOwnProperty.call(group, key)) {
            group[key] = [];
          }
          group[key].push(element);
        });
      } else {
        if (groupedByValue === 'ontology_combinded' && element.ontologies.length >= 1) {
          const sortedOntology = element.ontologies.map((ontology) => ontology.data.label).sort();
          key = sortedOntology.join(' - ');
        }

        deviceDescriptionsStore.addGroupToAllGroups(key);

        if (groupedByValue == 'short_label') {
          key = element.ancestor_ids[0] || element.id;
        }

        if (!Object.prototype.hasOwnProperty.call(group, key)) {
          group[key] = [];
        }
        group[key].push(element);
      }
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
    if (groupKey !== '[empty]' && groupKey !== '[other]' && !groupedByValue.includes('ontology')) {
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
          <div className="ms-3">
            <ElementDragHandle element={element} />
          </div>
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

DeviceDescriptionList.propTypes = {
  elements: PropTypes.array.isRequired,
  currentElement: PropTypes.object.isRequired,
  ui: PropTypes.object.isRequired,
};

export default observer(DeviceDescriptionList);
