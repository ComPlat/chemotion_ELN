import React, { useContext } from 'react';
import { Glyphicon } from 'react-bootstrap';
import Select from 'react-select';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceDescriptionListHeader = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;

  const options = [
    { value: 'serial_number', label: 'Grouped by Serial no' },
    { value: 'short_label', label: 'Grouped by short label' },
  ];

  const selectedValue = options.find(o => o.value === groupedByValue);

  const handleGroupSelect = (event) => {
    deviceDescriptionsStore.setListGroupedBy(event.value);
  }

  const toggleAllGroups = () => {
    deviceDescriptionsStore.toggleAllGroups();
  }

  const toggleAllButton = () => {
    const showAllGroups = deviceDescriptionsStore.show_all_groups;
    const icon = showAllGroups ? 'chevron-down' : 'chevron-right';

    return (
      <Glyphicon
        glyph={icon}
        title="Toggle all groups"
        onClick={() => toggleAllGroups()}
        style={{
          fontSize: '20px',
          cursor: 'pointer',
          color: '#337ab7',
          top: 0
        }}
      />
    );
  }

  return (
    <>
      <Select
        key="device-description-list-header-select"
        options={options}
        value={selectedValue}
        clearable={false}
        onChange={(e) => handleGroupSelect(e)}
        className="header-group-select"
      />
      {toggleAllButton()}
    </>
  );
}

export default observer(DeviceDescriptionListHeader);
