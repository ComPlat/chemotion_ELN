import React from 'react';
import { SectionReaction } from './SectionReaction';
import SectionSample from './SectionSample';
import SectionSiProcedures from './SectionSiProcedures';
import SectionSiSynthesis from './SectionSiSynthesis';
import SectionSpectrum from './SectionSpectrum';
import SectionReactionList from './SectionReactionList';

const objToKeyValPairs = (obj = []) => (
  obj.reduce((ob, { text, checked }) => {
    const o = ob;
    const oTitle = text.replace(/\s+/g, '').substring(0, 12);
    o[oTitle] = checked;
    return o;
  }, {})
);

const stdPreviews = ({ selectedObjs, splSettings, rxnSettings, configs }) => {
  const splSettingsPairs = objToKeyValPairs(splSettings);
  const rxnSettingsPairs = objToKeyValPairs(rxnSettings);
  const configsPairs = objToKeyValPairs(configs);

  const objs = selectedObjs.map((obj, i) => (
    obj.type === 'sample'
      ? <SectionSample
        key={i}
        sample={obj}
        settings={splSettingsPairs}
        configs={configsPairs}
      />
      : <SectionReaction
        key={i}
        reaction={obj}
        settings={rxnSettingsPairs}
        configs={configsPairs}
      />
  ));

  return (
    <div> {objs} </div>
  );
};

const suiPreviews = ({ selectedObjs, configs, molSerials, siRxnSettings }) => {
  const configsPairs = objToKeyValPairs(configs);
  const setPairs = objToKeyValPairs(siRxnSettings);

  return (
    <div>
      <p>Experimental Part:</p>
      <br />
      <h4>1 Versions</h4>
      <p>Version InChI (1.04), Version SMILES (Daylight)</p>
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
        settings={setPairs}
      />
      <br />
    </div>
  );
};

const spcPreviews = ({ prdAtts, molSerials, attThumbNails }) => (
  <div>
    <SectionSpectrum
      prdAtts={prdAtts}
      molSerials={molSerials}
      attThumbNails={attThumbNails}
    />
    <br />
  </div>
);

const rxlPreviews = ({ selectedObjs, molSerials }) => (
  <SectionReactionList
    objs={selectedObjs}
    molSerials={molSerials}
  />
);

const previewsContent = (props) => {
  switch (props.template) {
    case 'standard':
      return stdPreviews(props);
    case 'spectrum':
      return spcPreviews(props);
    case 'supporting_information':
      return suiPreviews(props);
    case 'rxn_list':
      return rxlPreviews(props);
    default:
      return null;
  }
};

const Previews = props => (
  <div className="report-preview">
    { previewsContent(props) }
  </div>
);

export default Previews;
