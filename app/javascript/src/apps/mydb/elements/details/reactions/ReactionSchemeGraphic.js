import React, { useEffect, useState, useMemo } from 'react';
import { Popover, ButtonGroup, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import Reaction from 'src/models/Reaction';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

export default function ReactionSchemeGraphic({ reaction, onToggleLabel, onRefresh, isRefreshing }) {
  const [svgProps, setSvgProps] = useState({});

  // Create a comprehensive checksum to detect all SVG-affecting changes
  // Memoized to prevent recalculation on every render
  const materialsChecksum = useMemo(() => {
    const materialData = (materials, includeEquivalent = false) => 
      (materials || []).map(m => {
        const base = `${m.id}:${m.svgPath || ''}:${m.show_label ? '1' : '0'}`;
        return includeEquivalent ? `${base}:${m.equivalent || 0}` : base;
      }).join('|');
    
    return [
      reaction.starting_materials?.length || 0,
      reaction.reactants?.length || 0,
      reaction.products?.length || 0,
      reaction.solvents?.length || 0,
      materialData(reaction.starting_materials),
      materialData(reaction.reactants),
      materialData(reaction.products, true), // Include equivalent for products
      materialData(reaction.solvents),
      reaction.temperature_display || '',
      reaction.duration || '',
      reaction.conditions || '',
      (reaction.solvents || []).map(s => s.preferred_label || s.external_label || '').join(','),
    ].join('||');
  }, [
    reaction.starting_materials,
    reaction.reactants,
    reaction.products,
    reaction.solvents,
    reaction.temperature_display,
    reaction.duration,
    reaction.conditions,
  ]);

  useEffect(() => {
    // Force update by updating SVG props - include timestamp in path for cache busting
    const svgPath = reaction.svgPath;
    const isSvgFile = svgPath && svgPath.substr(svgPath.length - 4) === '.svg';
    
    // Use timestamp from reaction if available, otherwise use checksum
    const updateKey = reaction._svgUpdateTimestamp || materialsChecksum;
    
    let newProps;
    if (isSvgFile) {
      // Add cache-busting query parameter to force reload
      const separator = svgPath.includes('?') ? '&' : '?';
      newProps = { svgPath: `${svgPath}${separator}_t=${updateKey}` };
    } else {
      // For inline SVG, include timestamp in a way that forces re-render
      newProps = { svg: reaction.reaction_svg_file };
    }
    
    setSvgProps(newProps);
  }, [reaction.svgPath, reaction.reaction_svg_file, reaction._svgUpdateTimestamp, materialsChecksum]);

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
    )};

  return (
    <div className="Reaction-scheme-graphic__wrapper">
      <div className="Reaction-scheme-graphic__svg-container">
        {isRefreshing && (
          <div className="Reaction-scheme-graphic__loader-overlay">
            <div className="text-center p-4">
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
