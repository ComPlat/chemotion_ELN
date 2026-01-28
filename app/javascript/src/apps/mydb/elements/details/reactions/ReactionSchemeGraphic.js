import React, { useEffect, useState, useMemo } from 'react';
import { Popover, ButtonGroup, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import Reaction from 'src/models/Reaction';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

export default function ReactionSchemeGraphic({ reaction, onToggleLabel }) {
  const [svgProps, setSvgProps] = useState({});

  useEffect(() => {
    setSvgProps(
      reaction.svgPath.substr(reaction.svgPath.length - 4) === '.svg'
        ? { svgPath: reaction.svgPath }
        : { svg: reaction.reaction_svg_file }
    );
  }, [reaction.svgPath, reaction.reaction_svg_file]);

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
    <div className="position-relative">
      <ConfigOverlayButton popoverSettings={
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
      />
      <SvgFileZoomPan
        duration={300}
        resize
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...svgProps}
      />
    </div>
  );
}

ReactionSchemeGraphic.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onToggleLabel: PropTypes.func.isRequired,
};
