import React from 'react';
import VesselEntry from 'src/apps/mydb/elements/list/vessel/VesselEntry';

export default function VesselContainer({ vesselGroups }) {
  return (
    <div className="list-container">
      {vesselGroups.map(
        (group) => (
          <VesselEntry
            key={group.vesselItems[0].id}
            vesselItems={group.vesselItems}
          />
        )
      )}
    </div>
  );
}
