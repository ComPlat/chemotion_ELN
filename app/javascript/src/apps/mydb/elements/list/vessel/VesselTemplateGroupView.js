import React, { useEffect, useState } from 'react';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import VesselEntry from 'src/apps/mydb/elements/list/vessel/VesselEntry';
import PropTypes from 'prop-types';

function VesselTemplateGroupView({ elements }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames().then(setTemplates);
  }, []);

  const grouped = templates.map((template) => {
    const vesselItems = elements.filter(
      (item) => item.vessel_template?.id === template.id
    );

    return {
      vesselTemplate: template,
      vesselItems,
    };
  });

  return (
    <div className="list-container">
      {grouped.map((group) => (
        <VesselEntry
          key={group.vesselTemplate.id}
          vesselTemplate={group.vesselTemplate}
          vesselItems={group.vesselItems}
        />
      ))}
    </div>
  );
}

VesselTemplateGroupView.propTypes = {
  elements: PropTypes.array.isRequired,
};

export default VesselTemplateGroupView;
