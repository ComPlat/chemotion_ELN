import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import Reaction from 'src/models/Reaction';

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
    <div>
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
