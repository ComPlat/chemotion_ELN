import React, { useEffect, useState } from 'react';
import {
  Popover, ButtonGroup, Button, OverlayTrigger, Tooltip,
  ButtonToolbar
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import Reaction from 'src/models/Reaction';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

// Ensure popovers/tooltips from this toolbar render above the scheme toolbar (z-index: 11)
// and above Bootstrap tooltips (z-index: 1080) when open
const popperConfigAboveToolbar = {
  modifiers: [
    {
      name: 'overlayAboveToolbar',
      enabled: true,
      phase: 'write',
      fn: ({ state }) => {
        // eslint-disable-next-line no-param-reassign
        state.styles.popper.zIndex = 1100;
      },
    },
  ],
};

const buildSbmmMaterialNames = (material) => {
  const materialNames = [];

  if (material.short_label) {
    materialNames.push(material.short_label);
  } else if (material.name) {
    materialNames.push(material.name);
  }

  if (material.name && material.name !== materialNames[0]) {
    materialNames.push(material.name);
  }

  return materialNames;
};

const renderSbmmImageToggle = (materialId, imageToggleButton, tooltipContainer) => (
  <OverlayTrigger
    placement="top"
    container={tooltipContainer}
    popperConfig={popperConfigAboveToolbar}
    overlay={
      (
        <Tooltip id={`sbmm-image-disabled-${materialId}`}>
          Molecular structure is not available for sequenced-based macromolecule samples.
        </Tooltip>
      )
    }
  >
    <span className="d-inline-block" style={{ cursor: 'not-allowed' }}>
      {imageToggleButton}
    </span>
  </OverlayTrigger>
);

export default function ReactionSchemeGraphic({
  reaction, onToggleLabel, onRefresh, isRefreshing
}) {
  const [svgProps, setSvgProps] = useState({});
  const tooltipContainer = typeof document !== 'undefined' ? document.body : undefined;

  useEffect(() => {
    // Use svgPath for both file URLs and data URIs (raw SVG is encoded as data URI in Reaction.svgPath)
    setSvgProps({ svgPath: reaction.svgPath });
  }, [reaction.svgPath]);

  if (!reaction.svgPath || !reaction.hasMaterials()) return null;

  const materialShowLabel = (material, isSbmm = false, groupKey = 'sample') => {
    const materialNames = [];

    if (isSbmm) {
      materialNames.push(...buildSbmmMaterialNames(material));
    } else {
      if (material.short_label && material.short_label !== 'reactant') {
        materialNames.push(material.short_label);
      }
      if (material.molecule && material.molecule.iupac_name) {
        materialNames.push(material.molecule.iupac_name);
      }
    }

    materialNames.push('\u00A0'); // Non-breaking space for empty second line

    const isImageActive = !material.show_label && !isSbmm;
    const imageToggleButton = (
      <ButtonGroupToggleButton
        active={isImageActive}
        onClick={() => onToggleLabel(material.id, isSbmm)}
        size="xsm"
        disabled={isSbmm}
      >
        <i className="fa fa-picture-o" />
      </ButtonGroupToggleButton>
    );

    return (
      <div key={`${groupKey}-${material.id}`} className="d-flex justify-content-between align-items-center gap-2">
        <div className="Reaction-scheme-graphic__material-name">
          <span className="Reaction-scheme-graphic__material-name-main">{materialNames[0]}</span>
          <span className="Reaction-scheme-graphic__material-name-subline">{materialNames[1]}</span>
        </div>
        <ButtonGroup>
          {isSbmm ? (
            renderSbmmImageToggle(material.id, imageToggleButton, tooltipContainer)
          ) : (
            imageToggleButton
          )}
          <ButtonGroupToggleButton
            active={material.show_label}
            onClick={() => onToggleLabel(material.id, isSbmm)}
            size="xsm"
          >
            <i className="icon-abc" />
          </ButtonGroupToggleButton>
        </ButtonGroup>
      </div>
    );
  };

  return (
    <div className="Reaction-scheme-graphic__wrapper">
      <div className="Reaction-scheme-graphic__svg-container">
        {isRefreshing && (
          <div className="Reaction-scheme-graphic__loader-overlay">
            <div className="text-center p-4">
              {/* eslint-disable-next-line max-len */}
              <i className="fa fa-refresh fa-spin fa-3x text-primary mb-3 d-block Reaction-scheme-graphic__loader-spinner" />
              <div className="text-muted fs-6 fw-medium">Refreshing SVGs...</div>
            </div>
          </div>
        )}
        <SvgFileZoomPan
          duration={300}
          resize
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...svgProps}
        />
      </div>
      <ButtonToolbar className="Reaction-scheme-graphic__toolbar">
        <ConfigOverlayButton
          popperConfig={popperConfigAboveToolbar}
          popoverSettings={
            (
              <Popover>
                <Popover.Header>Graphic Settings</Popover.Header>
                <Popover.Body className="border-bottom py-1">
                  <h6 className="fs-9 fw-medium">Starting Materials</h6>
                  {reaction.starting_materials.map(
                    (material) => materialShowLabel(material, false, 'starting_materials')
                  )}
                </Popover.Body>
                <Popover.Body className="border-bottom py-1">
                  <h6 className="fs-9 fw-medium">Reactants</h6>
                  {reaction.reactants.map((material) => materialShowLabel(material, false, 'reactants'))}
                  {reaction.reactant_sbmm_samples.map(
                    (material) => materialShowLabel(material, true, 'sbmm_reactants')
                  )}
                </Popover.Body>
                <Popover.Body className="py-1">
                  <h6 className="fs-9 fw-medium">Products</h6>
                  {reaction.products.map((material) => materialShowLabel(material, false, 'products'))}
                </Popover.Body>
              </Popover>
            )
          }
          onToggle={() => {}}
          wrapperClassName=""
        />
        {onRefresh && (
          <OverlayTrigger
            placement="left"
            overlay={<Tooltip id="refresh-graphic">Refresh SVG</Tooltip>}
            popperConfig={popperConfigAboveToolbar}
          >
            <Button
              size="xsm"
              variant="light"
              className="m-1"
              onClick={onRefresh}
            >
              <i className={`fa fa-refresh ${isRefreshing ? 'fa-spin' : ''}`} />
            </Button>
          </OverlayTrigger>
        )}
      </ButtonToolbar>
    </div>
  );
}

ReactionSchemeGraphic.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onToggleLabel: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
  isRefreshing: PropTypes.bool,
};

ReactionSchemeGraphic.defaultProps = {
  onRefresh: undefined,
  isRefreshing: false,
};
