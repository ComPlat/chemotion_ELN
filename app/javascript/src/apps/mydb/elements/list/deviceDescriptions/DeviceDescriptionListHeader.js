import React, { useContext } from 'react';
import { Select } from 'src/components/common/Select';

import UIActions from 'src/stores/alt/actions/UIActions';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function DeviceDescriptionListHeader() {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;

  const options = [
    { value: 'serial_number', label: 'Grouped by Serial no' },
    { value: 'short_label', label: 'Grouped by Short label' },
    { value: 'ontology', label: 'Grouped by Ontology' },
    { value: 'ontology_combined', label: 'Grouped by combined Ontologies' },
  ];

  const selectedValue = options.find((o) => o.value === groupedByValue);

  const handleGroupSelect = (event) => {
    UIActions.resetGroupCollapse({ type: 'device_description' });
    deviceDescriptionsStore.setListGroupedBy(event.value);
  };

  return (
    <Select
      key="device-description-list-header-select"
      options={options}
      value={selectedValue}
      clearable={false}
      onChange={(e) => handleGroupSelect(e)}
    />
  );
}

export default observer(DeviceDescriptionListHeader);
