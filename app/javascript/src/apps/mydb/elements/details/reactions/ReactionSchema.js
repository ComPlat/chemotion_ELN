import React, { useEffect, useState } from 'react';
import { Popover, ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import Reaction from 'src/models/Reaction';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

export default function ReactionSchema({ reaction, onSvgUpdate, graphicUpdateKey }) {
  const [svgProps, setSvgProps] = useState({});

  const updateReactionSvg = () => {
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map((material) => material.svgPath),
      reactants: reaction.reactants.map((material) => material.svgPath),
      products: reaction.products.map((material) => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter((s) => s);

    let temperature = reaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${reaction.temperature.valueUnit}`;
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(
      materialsSvgPaths,
      temperature,
      solvents,
      reaction.duration,
      reaction.conditions
    )
      .then((result) => {
        const svg = result.reaction_svg;
        onSvgUpdate(svg);
        setSvgProps(svg.substr(reaction.svgPath.length - 4) === '.svg'
          ? { svgPath: reaction.svgPath }
          : { svg: reaction.reaction_svg_file });
      });
  };

  const handleShowLabelChange = (id) => {
    reaction.toggleShowLabelForSample(id);
    updateReactionSvg();
  };

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
        <div className="reaction-schema__material-name">
          <span className="reaction-schema__material-name-main">{materialNames[0]}</span>
          <span className="reaction-schema__material-name-subline">{materialNames[1]}</span>
        </div>
        <ButtonGroup>
          <ButtonGroupToggleButton
            active={!material.show_label}
            onClick={() => handleShowLabelChange(material.id)}
            size="xsm"
          >
            <i className="fa fa-picture-o" />
          </ButtonGroupToggleButton>
          <ButtonGroupToggleButton
            active={material.show_label}
            onClick={() => handleShowLabelChange(material.id)}
            size="xsm"
          >
            <i className="icon-abc" />
          </ButtonGroupToggleButton>
        </ButtonGroup>
      </div>
    )};

  useEffect(() => {
    updateReactionSvg();
  }, [
    reaction.starting_materials,
    reaction.reactants,
    reaction.products,
    reaction.solvents,
    reaction.temperature_display,
    reaction.temperature?.valueUnit,
    reaction.duration,
    reaction.conditions,
    graphicUpdateKey // triggers update when parent wants
  ]);

  return (
    <div className="position-relative">
      <ConfigOverlayButton popoverSettings={
        (
          <Popover>
            <Popover.Header>Schema Settings</Popover.Header>
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

ReactionSchema.propTypes = {
  reaction: Reaction.isRequired,
  onSvgUpdate: PropTypes.func.isRequired,
  graphicUpdateKey: PropTypes.number.isRequired,
};
