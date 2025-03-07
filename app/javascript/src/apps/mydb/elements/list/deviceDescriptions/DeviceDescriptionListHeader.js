import React, { useContext } from 'react';
import { Select } from 'src/components/common/Select';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ChevronIcon from 'src/components/common/ChevronIcon';

const DeviceDescriptionListHeader = ({ elements }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const groupedByValue = deviceDescriptionsStore.list_grouped_by;

  let options = [
    { value: 'serial_number', label: 'Grouped by Serial no' },
    { value: 'short_label', label: 'Grouped by Short label' },
  ];
  let ontologies = [];

  elements.map((element) => {
    if (!element.ontologies) { return null; }
    element.ontologies.map((ontology) => {
      const value = `ontology.${ontology.data.label.toLowerCase().replaceAll(' ', '-')}`;
      const index = ontologies.findIndex((f) => f.value === value);
      if (index === -1) {
        ontologies.push({ value: value, label: `Grouped by ${ontology.data.label}` });
      }
    });
  });

  options.push.apply(options, ontologies.sort());

  const selectedValue = options.find(o => o.value === groupedByValue);

  const handleGroupSelect = (event) => {
    deviceDescriptionsStore.setListGroupedBy(event.value);
  }

  const toggleAllGroups = () => {
    deviceDescriptionsStore.toggleAllGroups();
  }

  const toggleAllButton = () => {
    return (
      <ChevronIcon
        direction={deviceDescriptionsStore.show_all_groups ? 'down' : 'right'}
        onClick={() => toggleAllGroups()}
        color="primary"
        className="fs-5"
        role="button"
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
