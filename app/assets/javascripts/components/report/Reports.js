import React, {Component} from 'react'
import SectionReaction from './SectionReaction'
import SectionSample from './SectionSample'

const objToKeyValPairs = (obj = []) => {
  return obj.reduce((o, {text, checked} ) => {
    const o_title = text.replace(/\s+/g, '').substring(0, 12);
    o[o_title] = checked
    return o
  }, {})
};

const Reports = ({selectedObjs, splSettings, rxnSettings, configs}) => {
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

export default Reports
