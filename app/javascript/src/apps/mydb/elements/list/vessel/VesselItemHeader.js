import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';

function VesselItemHeader({ groupItems }) {
  const { currentCollection } = UIStore.getState();
  const vessel = groupItems?.[0];
  const vesselTemplate = vessel?.vessel_template;

  const getGroupKey = useCallback(
    (item) => `${item.vessel_template.name}`,
    []
  );

  const navigateToTemplate = (template) => {
    if (!template?.id) {
      console.error('Vessel template ID is missing.');
      return;
    }

    const uri = `/vessel_template/${template.id}`;
    Aviator.navigate(uri, { silent: true });

    elementShowOrNew({
      type: 'vessel_template',
      params: {
        vesselTemplateID: template.id,
        collectionID: currentCollection.id,
      },
    });
  };

  const groupKey = getGroupKey(vessel);

  return (
    <button
      type="button"
      className="fs-5 btn btn-link p-0 text-start"
      onClick={() => navigateToTemplate(vesselTemplate)}
    >
      {groupKey}
    </button>
  );
}

VesselItemHeader.propTypes = {
  groupItems: PropTypes.arrayOf(
    PropTypes.shape({
      vessel_template: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
      }),
    })
  ).isRequired,
};

export default VesselItemHeader;
