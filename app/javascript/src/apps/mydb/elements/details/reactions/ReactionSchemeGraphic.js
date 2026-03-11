import React, { useEffect, useState } from 'react';
import {
  Popover, ButtonGroup, Button, OverlayTrigger, Tooltip
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

export default function ReactionSchemeGraphic({
  reaction, onToggleLabel, onRefresh, isRefreshing
}) {
  const [svgProps, setSvgProps] = useState({});

  useEffect(() => {
    // Use svgPath for both file URLs and data URIs (raw SVG is encoded as data URI in Reaction.svgPath)
    setSvgProps({ svgPath: reaction.svgPath });
  }, [reaction.svgPath]);

  if (!reaction.svgPath || !reaction.hasMaterials()) return null;

  const materialShowLabel = (material) => {
    const materialNames = [];
    if (material.short_label && material.short_label !== 'reactant') {
      materialNames.push(material.short_label);
    }
    if (material.molecule.iupac_name) {
      materialNames.push(material.molecule.iupac_name);
    }
    materialNames.push('\u00A0'); // Non-breaking space for empty second line
    return (
      <div key={material.id} className="d-flex justify-content-between align-items-center gap-2">
        <div className="Reaction-scheme-graphic__material-name">
          <span className="Reaction-scheme-graphic__material-name-main">{materialNames[0]}</span>
          <span className="Reaction-scheme-graphic__material-name-subline">{materialNames[1]}</span>
        </div>
        <ButtonGroup>
          <ButtonGroupToggleButton
            active={!material.show_label}
            onClick={() => onToggleLabel(material.id)}
            size="xsm"
          >
            <i className="fa fa-picture-o" />
          </ButtonGroupToggleButton>
          <ButtonGroupToggleButton
            active={material.show_label}
            onClick={() => onToggleLabel(material.id)}
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
      <div className="Reaction-scheme-graphic__toolbar">
        <ConfigOverlayButton
          popperConfig={popperConfigAboveToolbar}
          popoverSettings={
            (
              <Popover>
                <Popover.Header>Graphic Settings</Popover.Header>
                <Popover.Body className="border-bottom py-1">
                  <h6 className="fs-9 fw-medium">Starting Materials</h6>
                  {reaction.starting_materials.map((material) => (materialShowLabel(material, 'starting_materials')))}
                </Popover.Body>
                <Popover.Body className="border-bottom py-1">
                  <h6 className="fs-9 fw-medium">Reactants</h6>
                  {reaction.reactants.map((material) => (materialShowLabel(material, 'reactants')))}
                </Popover.Body>
                <Popover.Body className="py-1">
                  <h6 className="fs-9 fw-medium">Products</h6>
                  {reaction.products.map((material) => (materialShowLabel(material, 'products')))}
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
      </div>
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
