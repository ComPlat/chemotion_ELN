import React, { useState, useContext } from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ArrayUtils from 'src/utilities/ArrayUtils';
import CommentIcon from 'src/components/comments/CommentIcon';
import Aviator from 'aviator';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { elementShowOrNew } from 'src/utilities/routesUtils';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

const DeviceDescriptionList = ({ elements, currentElement, ui }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;
  const showAllGroups = deviceDescriptionsStore.show_all_groups;
  let keyboardElementIndex = null;
  const overlayToggle = <Tooltip id="toggle_molecule">Toggle Group</Tooltip>;

  const isElementSelected = (element) => {
    return (currentElement && currentElement.id === element.id);
  }

  const isElementChecked = (element) => {
    const { checkedIds, uncheckedIds, checkedAll } = ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  // componentDidMount() {
  //   KeyboardStore.listen(this.entriesOnKeyDown);
  // }

  // componentWillUnmount() {
  //   KeyboardStore.unlisten(this.entriesOnKeyDown);
  // }

  const entriesOnKeyDown = (state) => {
    //const { context } = state;
    //const { elements } = this.props;
    //
    //if (elements[0] == null || context !== elements[0].type) return false;
    //
    //const { documentKeyDownCode } = state;
    //let { keyboardElementIndex } = this.state;
    //
    //switch (documentKeyDownCode) {
    //  case 13: // Enter
    //  case 39: // Right
    //    if (keyboardElementIndex && elements[keyboardElementIndex]) {
    //      showDetails(elements[keyboardElementIndex]);
    //    }
    //    break;
    //  case 38: // Up
    //    if (keyboardElementIndex > 0) {
    //      keyboardElementIndex -= 1;
    //    } else {
    //      keyboardElementIndex = 0;
    //    }
    //    break;
    //  case 40: // Down
    //    if (keyboardElementIndex == null) {
    //      keyboardElementIndex = 0;
    //    } else if (keyboardElementIndex < elements.length - 1) {
    //      keyboardElementIndex += 1;
    //    }
    //    break;
    //  default:
    //}
    //this.setState({ keyboardElementIndex });
    //
    //return null;
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
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
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
    const groupValue = groupedByValue == 'vendor_id' ? group[0].vendor_company_name : group[0].name;
    const groupName = groupKey === '[empty]' ? groupKey : `${groupKey} ${groupValue}`;

    return (
      <tr
        style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
        onClick={() => toggleShownGroup(key, shownGroup)}
      >
        <td colSpan="2" style={{ position: 'relative' }}>
          <div style={{ float: 'left' }}>
            <div className="preview-table">
              {groupName}
            </div>
          </div>
          <div style={{ position: 'absolute', right: '3px', top: '14px' }}>
            <OverlayTrigger placement="bottom" overlay={overlayToggle}>
              <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }}>
                <i className={`glyphicon ${icon}`} />
              </span>
            </OverlayTrigger>
          </div>
        </td>
        {dragColumn(key)}
      </tr>
    );
  }

  const ListItem = (element, index) => {
    let style = {};
    if (isElementSelected(element)
      || (keyboardElementIndex != null && keyboardElementIndex === index)) {
      style = {
        color: '#000',
        background: '#ddd',
        border: '4px solid #337ab7'
      };
    }

    return (
      <tr key={element.id} style={style}>
        <td width="30px">
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
          style={{ cursor: 'pointer' }}
          width='unset'
        >
          <div>
            {element.title()}
            <br />
            <br />
            <CommentIcon commentCount={element.comment_count} />
            <ElementCollectionLabels element={element} key={element.id} />
          </div>
        </td>
        {dragColumn(element)}
      </tr>
    );
  }

  return (
    <Table className="device-description-list" bordered hover style={{ borderTop: 0 }}>
      <tbody>
        {listItems()}
      </tbody>
    </Table>
  );
}

export default observer(DeviceDescriptionList);
