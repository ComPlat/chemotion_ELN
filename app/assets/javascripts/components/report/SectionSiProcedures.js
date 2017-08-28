import React from 'react';
import { SVGContent, DescriptionContent } from './SectionReaction';
import { rmDeltaRedundantSpaceBreak } from '../utils/quillFormat';

const Title = ({el, counter}) => {
  return (
    <p>
      [3.{counter}] {el.name} ({el.short_label})
    </p>
  );
}

const ProcedureRow = ({el, counter}) => {
  const clean_desc = rmDeltaRedundantSpaceBreak(el.description);
  return (
    <div>
      <Title el={el} counter={counter} />
      <SVGContent
        show={true}
        svgPath={el.svgPath}
        products={[]}
        isProductOnly={false}
      />
      <DescriptionContent show={true} description={clean_desc} />
    </div>
  );
}

const SectionSiProcedures = ({selectedObjs}) => {
  let counter = 0;
  const contents = selectedObjs.map( obj => {
    if(obj.type === 'reaction' && obj.role === 'gp') {
      counter += 1;
      return (
        <ProcedureRow id={obj.id} key={obj.id} el={obj} counter={counter}/>
      );
    }
  });

  return (
    <div>
      {contents}
    </div>
  );
}

export default SectionSiProcedures;
