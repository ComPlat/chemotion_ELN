import React, { useEffect, useState } from 'react';
import {
  Popover, ButtonGroup, Button, OverlayTrigger, Tooltip, ButtonToolbar
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import Reaction from 'src/models/Reaction';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

// ---------- utils ----------

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

const sbmmMaterialNames = (material) => {
  const primary = material.short_label || material.name || null;
  const secondary =
    material.name && material.name !== primary ? material.name : null;
  return [primary, secondary].filter(Boolean);
};

const standardMaterialNames = (material) => {
  const names = [];
  if (material.short_label && material.short_label !== 'reactant') {
    names.push(material.short_label);
  }
  if (material.molecule && material.molecule.iupac_name) {
    names.push(material.molecule.iupac_name);
  }
  return names;
};

// Returns the two label lines displayed in the popover row.
// Appends a non-breaking space so a missing second line still reserves vertical space,
// matching the original behavior exactly (empty second line = NBSP; no names = NBSP + undefined).
const resolveMaterialLabelLines = (material, isSbmm) => {
  const names = isSbmm
    ? sbmmMaterialNames(material)
    : standardMaterialNames(material);
  const padded = [...names, '\u00A0'];
  return { main: padded[0], subline: padded[1] };
};

const isImageToggleActive = (material, isSbmm) =>
  !material.show_label && !isSbmm;

const getTooltipContainer = () =>
  typeof document !== 'undefined' ? document.body : undefined;

// ---------- hook ----------

// Preserves the original two-phase render: SvgFileZoomPan mounts with no svgPath,
// then the effect injects it. Keeping this hook isolates that quirk.
const useDelayedSvgProps = (svgPath) => {
  const [svgProps, setSvgProps] = useState({});
  useEffect(() => {
    setSvgProps({ svgPath });
  }, [svgPath]);
  return svgProps;
};

// ---------- presentational sub-components ----------

const SbmmImageToggleWrapper = ({ materialId, tooltipContainer, children }) => (
  <OverlayTrigger
    placement="top"
    container={tooltipContainer}
    popperConfig={popperConfigAboveToolbar}
    overlay={(
      <Tooltip id={`sbmm-image-disabled-${materialId}`}>
        Molecular structure is not available for sequenced-based macromolecule samples.
      </Tooltip>
    )}
  >
    <span className="d-inline-block" style={{ cursor: 'not-allowed' }}>
      {children}
    </span>
  </OverlayTrigger>
);

const MaterialLabelRow = ({
  material, isSbmm, groupKey, onToggleLabel, tooltipContainer,
}) => {
  const { main, subline } = resolveMaterialLabelLines(material, isSbmm);
  const imageActive = isImageToggleActive(material, isSbmm);

  const imageToggleButton = (
    <ButtonGroupToggleButton
      active={imageActive}
      onClick={() => onToggleLabel(material.id, isSbmm)}
      size="xsm"
      disabled={isSbmm}
    >
      <i className="fa fa-picture-o" />
    </ButtonGroupToggleButton>
  );

  return (
    <div
      key={`${groupKey}-${material.id}`}
      className="d-flex justify-content-between align-items-center gap-2"
    >
      <div className="Reaction-scheme-graphic__material-name">
        <span className="Reaction-scheme-graphic__material-name-main">{main}</span>
        <span className="Reaction-scheme-graphic__material-name-subline">{subline}</span>
      </div>
      <ButtonGroup>
        {isSbmm ? (
          <SbmmImageToggleWrapper
            materialId={material.id}
            tooltipContainer={tooltipContainer}
          >
            {imageToggleButton}
          </SbmmImageToggleWrapper>
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

const MaterialGroupSection = ({
  title, materials, isSbmm, groupKey, onToggleLabel, tooltipContainer,
}) => (
  <>
    {title && <h6 className="fs-9 fw-medium">{title}</h6>}
    {materials.map((material) => (
      <MaterialLabelRow
        key={`${groupKey}-${material.id}`}
        material={material}
        isSbmm={isSbmm}
        groupKey={groupKey}
        onToggleLabel={onToggleLabel}
        tooltipContainer={tooltipContainer}
      />
    ))}
  </>
);

const GraphicSettingsPopover = ({ reaction, onToggleLabel, tooltipContainer }) => (
  <Popover>
    <Popover.Header>Graphic Settings</Popover.Header>
    <Popover.Body className="border-bottom py-1">
      <MaterialGroupSection
        title="Starting Materials"
        materials={reaction.starting_materials}
        isSbmm={false}
        groupKey="starting_materials"
        onToggleLabel={onToggleLabel}
        tooltipContainer={tooltipContainer}
      />
    </Popover.Body>
    <Popover.Body className="border-bottom py-1">
      <MaterialGroupSection
        title="Reactants"
        materials={reaction.reactants}
        isSbmm={false}
        groupKey="reactants"
        onToggleLabel={onToggleLabel}
        tooltipContainer={tooltipContainer}
      />
      <MaterialGroupSection
        materials={reaction.reactant_sbmm_samples}
        isSbmm
        groupKey="sbmm_reactants"
        onToggleLabel={onToggleLabel}
        tooltipContainer={tooltipContainer}
      />
    </Popover.Body>
    <Popover.Body className="py-1">
      <MaterialGroupSection
        title="Products"
        materials={reaction.products}
        isSbmm={false}
        groupKey="products"
        onToggleLabel={onToggleLabel}
        tooltipContainer={tooltipContainer}
      />
    </Popover.Body>
  </Popover>
);

const RefreshingOverlay = () => (
  <div className="Reaction-scheme-graphic__loader-overlay">
    <div className="text-center p-4">
      {/* eslint-disable-next-line max-len */}
      <i className="fa fa-refresh fa-spin fa-3x text-primary mb-3 d-block Reaction-scheme-graphic__loader-spinner" />
      <div className="text-muted fs-6 fw-medium">Refreshing SVGs...</div>
    </div>
  </div>
);

const RefreshButton = ({ onRefresh, isRefreshing }) => (
  <OverlayTrigger
    placement="left"
    overlay={<Tooltip id="refresh-graphic">Refresh SVG</Tooltip>}
    popperConfig={popperConfigAboveToolbar}
  >
    <Button size="xsm" variant="light" onClick={onRefresh}>
      <i className={`fa fa-refresh ${isRefreshing ? 'fa-spin' : ''}`} />
    </Button>
  </OverlayTrigger>
);

// ---------- main component ----------

export default function ReactionSchemeGraphic({
  reaction, onToggleLabel, onRefresh, isRefreshing,
}) {
  const svgProps = useDelayedSvgProps(reaction.svgPath);
  const tooltipContainer = getTooltipContainer();

  if (!reaction.svgPath || !reaction.hasMaterials()) return null;

  return (
    <div className="Reaction-scheme-graphic__wrapper">
      <div className="Reaction-scheme-graphic__svg-container">
        {isRefreshing && <RefreshingOverlay />}
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
          popoverSettings={(
            <GraphicSettingsPopover
              reaction={reaction}
              onToggleLabel={onToggleLabel}
              tooltipContainer={tooltipContainer}
            />
          )}
          onToggle={() => {}}
          wrapperClassName=""
        />
        {onRefresh && (
          <RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
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
