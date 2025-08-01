import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import VesselItemHeader from 'src/apps/mydb/elements/list/vessel/VesselItemHeader';
import VesselItemEntry from 'src/apps/mydb/elements/list/vessel/VesselItemEntry';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';

export default function VesselContainer({ vesselGroups }) {
  const getGroupKey = useCallback(
    (vessel) => `${vessel.vessel_template?.name}`,
    []
  );

  return (
    <ElementGroupsRenderer
      type="vessel"
      elements={vesselGroups}
      getGroupKey={getGroupKey}
      renderGroupHeader={(groupArray) => (
        <VesselItemHeader groupItems={groupArray} />
      )}
      renderGroupItem={(item) => (
        <VesselItemEntry key={item.id} vesselItem={item} />
      )}
    />
  );
}

VesselContainer.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  vesselGroups: PropTypes.arrayOf(PropTypes.object).isRequired,
};
