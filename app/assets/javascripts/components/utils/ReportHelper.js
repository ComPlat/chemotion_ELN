const keepObjsAsIds = (oriSelectedObjs, newElems, ids, type, defaultTags) => {
  const allObjs = oriSelectedObjs.concat(newElems)
    .filter(obj => obj != null) || [];
  const allObjIds = allObjs.map(obj => `${obj.id}_${obj.type}`);
  return allObjs.map((obj, pos) => {
    const identifier = `${obj.id}_${obj.type}`;
    if (allObjIds.indexOf(identifier) !== pos) { // rm duplicate
      return null;
    }
    if (obj.type !== type) {
      return obj;
    }
    if (obj.type === type && ids.indexOf(obj.id) !== -1) {
      return obj;
    }
    if (defaultTags[`${obj.type}Ids`].indexOf(obj.id) !== -1) {
      return obj;
    }
    return null;
  }).filter(obj => obj != null) || [];
};

const UpdateSelectedObjs = (newTags, newObjs, defaultTags, oriObjs = []) => {
  const { sampleIds, reactionIds } = newTags;
  const { samples, reactions } = newObjs;
  let selectedObjs = keepObjsAsIds(oriObjs,
    samples, sampleIds, 'sample', defaultTags);
  selectedObjs = keepObjsAsIds(selectedObjs,
    reactions, reactionIds, 'reaction', defaultTags);
  return selectedObjs;
};

const GetTypeIds = (objs, type) => {
  return objs.map((obj) => {
    if (obj.type === type) {
      return obj.id;
    }
    return null;
  }).filter(r => r !== null);
};

const UserSerial = (molecule, molSerials = []) => {
  let output = 'xx';
  molSerials.forEach((ms) => {
    if (ms.mol.id === molecule.id && ms.value) output = ms.value;
  });
  return output;
};

const OrderPreviewObjs = (oriPreviewObjs, selectedObjs, newPreviewObjs) => {
  const previewObjs = [...oriPreviewObjs, ...newPreviewObjs];
  return (
    selectedObjs.map(o => (
      previewObjs.map(
        p => ((p.id === o.id && p.type === o.type) ? p : null)
      ).filter(r => r !== null)[0]
    )).filter(r => r !== null)
  );
};

const LoadPreviewIds = (reportState) => {
  const { selectedObjTags, defaultObjTags, previewObjs } = reportState;
  const sids = [...selectedObjTags.sampleIds, ...defaultObjTags.sampleIds];
  const rids = [...selectedObjTags.reactionIds, ...defaultObjTags.reactionIds];
  let psids = [];
  let prids = [];
  previewObjs.forEach((o) => {
    if (o.type === 'sample') {
      psids = [...psids, o.id];
    } else {
      prids = [...prids, o.id];
    }
  });
  const lsids = sids.filter(x => !psids.includes(x));
  const lrids = rids.filter(x => !prids.includes(x));
  const targets = {
    sample: { checkedIds: lsids },
    reaction: { checkedIds: lrids },
  };
  return targets;
};

const CapitalizeFirstLetter = (str) => {
  if (str && str.length > 0) {
    let charIdxs = [];
    [...str].forEach((t, idx) => {
      if (/^[a-zA-Z()]$/.test(t)) {
        charIdxs = [...charIdxs, idx];
      }
    });
    const charIdx = charIdxs[0];
    if (charIdx >= 0) {
      return (
        str.slice(0, charIdx) +
        str.charAt(charIdx).toUpperCase() +
        str.slice(charIdx + 1)
      );
    }
  }
  return str
};

module.exports = {
  UpdateSelectedObjs, GetTypeIds, UserSerial, OrderPreviewObjs, LoadPreviewIds,
  CapitalizeFirstLetter,
};
