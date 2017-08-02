import React from 'react';

const keepObjsAsIds = (oriSelectedObjs, newElems, ids, type) => {
  const allObjs = oriSelectedObjs.concat(newElems)
                                  .filter(obj => obj != null) || [];
  return allObjs.map( obj => {
    if(obj.type !== type){
      return obj;
    }
    if(obj.type === type && ids.indexOf(obj.id) !== -1){
      const index = ids.indexOf(obj.id);
      ids = [ ...ids.slice(0, index), ...ids.slice(index + 1) ]
      return obj;
    }
    return null;
  }).filter(obj => obj != null) || [];
}

const UpdateSelectedObjs = (newTags, newObjs, oriSelectedObjs = []) => {
  const { sampleIds, reactionIds } = newTags;
  const { samples, reactions } = newObjs;
  let selectedObjs = keepObjsAsIds(oriSelectedObjs,
                                    samples, sampleIds, 'sample');
  selectedObjs = keepObjsAsIds(selectedObjs,
                                reactions, reactionIds, 'reaction');
  return selectedObjs;
}

export default UpdateSelectedObjs;
