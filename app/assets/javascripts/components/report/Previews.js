import React, {Component} from 'react';
import { SectionReaction } from './SectionReaction';
import SectionSample from './SectionSample';
import SectionSiProcedures from './SectionSiProcedures';
import SectionSiSynthesis from './SectionSiSynthesis';

const objToKeyValPairs = (obj = []) => {
  return obj.reduce((o, {text, checked} ) => {
    const o_title = text.replace(/\s+/g, '').substring(0, 12);
    o[o_title] = checked
    return o
  }, {})
};

const StdPreviews = ({selectedObjs, splSettings, rxnSettings, configs}) => {
  const splSettings_pairs = objToKeyValPairs(splSettings);
  const rxnSettings_pairs = objToKeyValPairs(rxnSettings);
  const configs_pairs = objToKeyValPairs(configs);

  const objs = selectedObjs.map( (obj, i) => {
    return (
      obj.type === 'sample'
        ? <SectionSample key={i} sample={obj} settings={splSettings_pairs} configs={configs_pairs}/>
        : <SectionReaction key={i} reaction={obj} settings={rxnSettings_pairs} configs={configs_pairs}/>
    )
  })
  return (
    <div> {objs} </div>
  )
}

const SiPreviews = ({ selectedObjs, configs, molSerials }) => {
  const configsPairs = objToKeyValPairs(configs);

  return (
    <div>
      <p>Experimental Part:</p>
      <br />
      <h4>1 Versions</h4>
      <p>Version InCHI (1.04), Version SMILES (Daylight)</p>
      <br />
      <h4>2 General remarks</h4>
      <br />
      <h4>3 General procedures</h4>
      <SectionSiProcedures selectedObjs={selectedObjs} />
      <br />
      <h4>4 Synthesis</h4>
      <SectionSiSynthesis
        selectedObjs={selectedObjs}
        configs={configsPairs}
        molSerials={molSerials}
      />
      <br />
    </div>
  );
};

const Previews = ({selectedObjs, splSettings, rxnSettings, configs, template, molSerials}) => {
  const content = template === 'supporting_information'
                    ? <SiPreviews
                        selectedObjs={selectedObjs}
                        configs={configs}
                        molSerials={molSerials}
                      />
                    : <StdPreviews
                        selectedObjs={selectedObjs}
                        splSettings={splSettings}
                        rxnSettings={rxnSettings}
                        configs={configs} />
  return (
    <div className='report-preview'>
      {content}
    </div>
  );
}

export default Previews;
