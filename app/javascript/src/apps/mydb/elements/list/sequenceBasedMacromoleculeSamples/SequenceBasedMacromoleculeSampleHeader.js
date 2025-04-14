import React, { useContext } from 'react';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ChevronIcon from 'src/components/common/ChevronIcon';

const SequenceBasedMacromoleculeSampleHeader = ({ elements }) => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;

  const toggleAllGroups = () => {
    sbmmStore.toggleAllGroups();
  }

  const toggleAllButton = () => {
    return (
      <ChevronIcon
        direction={sbmmStore.show_all_groups ? 'down' : 'right'}
        onClick={() => toggleAllGroups()}
        color="primary"
        className="fs-5"
        role="button"
      />
    );
  }

  return toggleAllButton();
}

export default observer(SequenceBasedMacromoleculeSampleHeader);
