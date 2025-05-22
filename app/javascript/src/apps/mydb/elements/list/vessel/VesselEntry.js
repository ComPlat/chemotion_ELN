/* eslint-disable no-use-before-define */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState } from 'react';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselItemEntry from 'src/apps/mydb/elements/list/vessel/VesselItemEntry';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { elementShowOrNew } from 'src/utilities/routesUtils';

function VesselEntry({ vesselItems, vesselTemplate }) {
  const { currentCollection } = UIStore.getState();
  const [showEntries, setShowEntries] = useState(true);

  const getBorderStyle = () => (showEntries
    ? 'list-container title-panel p-3'
    : 'list-container title-panel p-3 cell-line-group-bottom-border');

  const renderItemEntries = () => (
    showEntries
      ? vesselItems.map((vesselItem) => (
        <VesselItemEntry key={vesselItem.id} vesselItem={vesselItem} />
      ))
      : []);

  const navigateToTemplate = (template) => {
    if (!template.id) {
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

  const findThumbnailAttachment = (vessels) => {
    const searchContainer = (container) => {
      if (!container) return null;

      const thumbnail = container.attachments?.find((attachment) => attachment.preview);
      if (thumbnail) return thumbnail;
      return container.children?.map(searchContainer).find(Boolean) || null;
    };
    return vessels.map((vessel) => searchContainer(vessel.vessel_template?.container)).find(Boolean) || null;
  };

  const renderNameHeader = () => {
    const thumb = findThumbnailAttachment(vesselItems);
    const imgSrc = thumb ? thumb.thumbnail : null;
  
    return (
      <div className="d-flex gap-2 align-items-center">
        {imgSrc ? (
          <img
            src={`data:image/png;base64,${thumb.thumbnail}`}
            alt={vesselTemplate.name || 'Vessel'}
            className="me-2 border rounded img-fluid"
          />
        ) : (
          <div className="me-2" />
        )}
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="template-tooltip">Click to view vessel template details</Tooltip>}
        >
          <div
            className="fs-5"
            style={{ cursor: 'pointer' }}
            onClick={() => navigateToTemplate(vesselTemplate)}
          >
            {vesselTemplate.name}
          </div>
        </OverlayTrigger>
        <div className="ms-auto" onClick={(e) => { e.stopPropagation(); setShowEntries((prev) => !prev); }}>
          <ChevronIcon size="sm" color="primary" direction={showEntries ? 'down' : 'right'} />
        </div>
      </div>
    );
  };
  

  // if (vesselItems.length === 0) return null;

  return (
    <div className="cell-line-group">
      <div className={getBorderStyle()}>
        {/* {renderNameHeader(vesselItems[0])} */}
        {renderNameHeader()}
      </div>
      {renderItemEntries()}
    </div>
  );
}

VesselEntry.propTypes = {
  vesselItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      container: PropTypes.object,
      vesselInstanceName: PropTypes.string,
      vesselInstanceDescription: PropTypes.string,
      barCode: PropTypes.string,
      qrCode: PropTypes.string,
      weightAmount: PropTypes.number,
      weightUnit: PropTypes.string,
    })
  ).isRequired,
  vesselTemplate: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default VesselEntry;
