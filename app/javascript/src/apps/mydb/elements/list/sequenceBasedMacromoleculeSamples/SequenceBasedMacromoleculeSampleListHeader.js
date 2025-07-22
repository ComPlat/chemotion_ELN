import React, { useContext } from 'react';
import { Select } from 'src/components/common/Select';

import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function SequenceBasedMacromoleculeSampleListHeader() {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const groupedByValue = sbmmStore.list_grouped_by;

  const options = [
    { value: 'sbmm', label: 'Grouped by Sample' },
    { value: 'sbmm_sequence', label: 'Grouped by SBMM Sequence' },
  ];

  const selectedValue = options.find((o) => o.value === groupedByValue);

  const handleGroupSelect = (event) => {
    UIActions.resetGroupCollapse({ type: 'sequence_based_macromolecule_sample' });
    ElementActions.changeSbmmSampleOrder(event.value);
    sbmmStore.setListGroupedBy(event.value);
  };

  return (
    <Select
      key="sbmm-sample-list-header-select"
      options={options}
      value={selectedValue}
      clearable={false}
      onChange={(e) => handleGroupSelect(e)}
    />
  );
}

export default observer(SequenceBasedMacromoleculeSampleListHeader);