import React, { useEffect, useState } from 'react';
import {
  Popover, ButtonGroup, Button, CloseButton, OverlayTrigger, Tooltip,
  ButtonToolbar, Form
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import Reaction, { reactionSvgPath } from 'src/models/Reaction';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import { variationFingerprint } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
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

/*
The scheme of one of the reaction's variations, drawn by the same endpoint as the reaction's - which
stores nothing - and kept here only, so nothing of it ends up in the variation. Drawn again when the
variation changes, when the reaction's own scheme does (label toggles, refreshed images) and on
`refreshToken`. A response for a variation no longer selected is dropped.
*/
const useVariationSvg = (variation, reactionSvg, refreshToken) => {
  const [drawn, setDrawn] = useState({ request: null, id: null, svgPath: null });
  const variationId = variation?.data?.id ?? null;
  // What the scheme is drawn from; a drawing made for another request is not the current one.
  const request = variation
    ? JSON.stringify([variationId, variationFingerprint(variation.data), reactionSvg, refreshToken])
    : null;

  useEffect(() => {
    if (!variation) {
      return undefined;
    }
    let current = true;
    ReactionSvgFetcher.fetchByReaction(variation.data)
      .then((result) => {
        if (!current) return;
        const svgPath = result?.reaction_svg ? reactionSvgPath(result.reaction_svg) : null;
        setDrawn({ request, id: variationId, svgPath });
      })
      .catch(() => {
        // The reaction's own scheme is shown instead.
        if (current) setDrawn({ request, id: variationId, svgPath: null });
      });
    return () => { current = false; };
    // `request` stands for the variation, whose object is rebuilt on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return {
    id: drawn.id,
    svgPath: drawn.svgPath,
    // Until the drawing for the current request arrives; the previous one of the variation stays shown.
    loading: request !== null && drawn.request !== request,
  };
};

export default function ReactionSchemeGraphic({
  reaction, onToggleLabel, onRefresh, isRefreshing, variations, selectedVariationId, onSelectVariation
}) {
  const [svgProps, setSvgProps] = useState({});
  const [refreshToken, setRefreshToken] = useState(0);
  const tooltipContainer = typeof document !== 'undefined' ? document.body : undefined;
  const isInteractionReaction = reaction.isInteractionReaction();

  const selectedVariation = variations.find(({ data }) => data?.id === selectedVariationId) ?? null;
  const variationSvg = useVariationSvg(selectedVariation, reaction.svgPath, refreshToken);
  const shownSvgPath = selectedVariation && variationSvg.id === selectedVariationId && variationSvg.svgPath
    ? variationSvg.svgPath
    : reaction.svgPath;

  useEffect(() => {
    // Use svgPath for both file URLs and data URIs (raw SVG is encoded as data URI in Reaction.svgPath)
    setSvgProps({ svgPath: shownSvgPath });
  }, [shownSvgPath]);

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

  const popoverSettings = ({ close }) => (
    <Popover>
      <Popover.Header className="d-flex justify-content-between align-items-center">
        Graphic Settings
        <CloseButton onClick={close} />
      </Popover.Header>
      {!isInteractionReaction && (
        <>
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
        </>
      )}
      <Popover.Body className="py-1">
        <h6 className="fs-9 fw-medium">Products</h6>
        {reaction.products.map((material) => materialShowLabel(material, false, 'products'))}
      </Popover.Body>
    </Popover>
  );

  return (
    <div className="Reaction-scheme-graphic__wrapper">
      <div className="Reaction-scheme-graphic__svg-container">
        {(isRefreshing || variationSvg.loading) && (
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
        {variations.length > 0 && (
          <OverlayTrigger
            placement="left"
            overlay={(
              <Tooltip id="graphic-variation">
                Draw the scheme of the reaction or of one of its variations
              </Tooltip>
            )}
            popperConfig={popperConfigAboveToolbar}
          >
            <Form.Select
              size="sm"
              className="Reaction-scheme-graphic__variation-select"
              aria-label="Scheme of"
              value={selectedVariation ? selectedVariationId : ''}
              onChange={(event) => onSelectVariation(event.target.value || null)}
            >
              <option value="">Reaction</option>
              {variations.map(({ data, label }) => (
                <option key={data.id} value={data.id}>{`Variation #${label}`}</option>
              ))}
            </Form.Select>
          </OverlayTrigger>
        )}
        <ConfigOverlayButton
          key={isInteractionReaction ? 'interaction' : 'standard'}
          popperConfig={popperConfigAboveToolbar}
          popoverSettings={popoverSettings}
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
              onClick={() => {
                onRefresh();
                // A variation's scheme is drawn again as well.
                if (selectedVariation) setRefreshToken((token) => token + 1);
              }}
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
  // The reaction's variations, in the { idx, label, data } shape of the Variations tab.
  variations: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    data: PropTypes.instanceOf(Reaction),
  })),
  // The id of the variation whose scheme is shown; null for the reaction's own.
  selectedVariationId: PropTypes.string,
  onSelectVariation: PropTypes.func,
};

ReactionSchemeGraphic.defaultProps = {
  onRefresh: undefined,
  isRefreshing: false,
  variations: [],
  selectedVariationId: null,
  onSelectVariation: () => {},
};
