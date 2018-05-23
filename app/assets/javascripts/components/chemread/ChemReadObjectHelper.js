import { solvents } from '../staticDropdownOptions/reagents/solvents';

const ChemReadObjectHelper = {
  renderSvg(svg) {
    let newSvg = svg.replace(/<rect.*\/>/, '');
    const viewBox = svg.match(/viewBox="(.*)"/)[1];
    newSvg = newSvg.replace(/<svg.*viewBox.*>/, '');
    newSvg = newSvg.replace(/<\/svg><\/svg>/, '</svg>');
    const svgDOM = new DOMParser().parseFromString(newSvg, 'image/svg+xml');
    const editedSvg = svgDOM.documentElement;
    editedSvg.removeAttribute('width');
    editedSvg.removeAttribute('height');
    editedSvg.setAttribute('viewBox', viewBox);
    editedSvg.setAttribute('width', '100%');
    return editedSvg.outerHTML;
  },
  extractDetails(desc) {
    if (Object.keys(desc).includes('time')) {
      return { description: desc.detail };
    }

    const details = {};
    Object.keys(desc).forEach((k) => {
      if (!desc[k]) return;

      if (k === 'detail') {
        const detailOutline = desc[k];

        Object.keys(detailOutline).forEach((dk) => {
          const detailList = detailOutline[dk];

          detailList.forEach((detail, idx) => {
            const detailKey = detailList.length === 1 ? dk : `${dk} ${idx + 1}`;
            const dconstructor = detail.constructor;

            if (dconstructor === Object) {
              details[detailKey] = detail;
            } else if (dconstructor === String) {
              const trimmedDetail = detail.trim();
              if (trimmedDetail) {
                const dobj = {};
                dobj[detailKey] = trimmedDetail;
                details[dk] = Object.assign(details[dk] || {}, dobj);
              }
            }
          });
        });
      } else {
        Object.keys(desc[k]).forEach((d) => {
          const dk = k.endsWith('s') ? k.slice(0, -1) : k;
          const dkey = `${dk} ${parseInt(d, 10) + 1}`;
          details[dkey] = desc[k][d].detail;
        });
      }
    });

    return details;
  },
  generateExportRow(info) {
    const generateTextFromInfo = (name, tinfo) => {
      if (!tinfo) return '';

      const descArr = [];

      Object.keys(tinfo).forEach((key) => {
        const desc = tinfo[key];
        if (!desc) return;
        descArr.push(`${name} ${key}:`);

        Object.keys(desc).forEach((x) => {
          const dProp = desc[x];
          if (!dProp) return;

          if (x === 'detail') {
            Object.keys(dProp).forEach((propKey) => {
              if (propKey === 'ID' || propKey === 'parentID' || !dProp[propKey]) return;
              descArr.push(` - ${propKey}: ${dProp[propKey]}`);
            });
          } else {
            if (!desc[x]) return;
            descArr.push(` - ${x}: ${desc[x]}`);
          }
        });
      });

      return descArr.join('\n');
    };

    const row = [];
    const smiArr = info.smi.split('>');
    let solventsAdded = '';

    if (info.editedSmi && info.editedSmi !== '') {
      const editedSmiArr = info.editedSmi.split(',');
      solventsAdded = editedSmiArr.filter(x => (
        Object.values(solvents).indexOf(x) > -1
      )).join(',');

      const allSolvents = smiArr[1].split('.').concat(editedSmiArr);
      smiArr[1] = allSolvents.filter(x => x).join('.');
    }

    const temperature = [];
    const time = [];
    const reactionDesc = [];
    const reactionYield = [];

    let reactantDescs = '';
    let productDescs = '';

    if (info.desc) {
      if (info.desc.reagents) {
        Object.keys(info.desc.reagents).forEach((key) => {
          const desc = info.desc.reagents[key];
          temperature.push(desc.temperature);
          time.push(desc.time);
          reactionYield.push(desc.yield);
          reactionDesc.push(`- Description: ${desc.text}`);
        });
      }

      if (info.desc.detail) {
        Object.keys(info.desc.detail).forEach((k) => {
          const details = info.desc.detail[k];

          details.forEach((detail, idx) => {
            const detailKey = details.length === 1 ? k : `${k} ${idx + 1}`;
            const dconstructor = detail.constructor;

            if (dconstructor === Object) {
              Object.keys(detail).forEach((dkey) => {
                if (!detail[dkey]) return;
                reactionDesc.push(`- ${dkey}: ${detail[dkey]}`);
              });
            } else if (dconstructor === String) {
              if (!detail) return;
              reactionDesc.push(`- ${detailKey}: ${detail}`);
            }
          });
        });
      }

      reactantDescs = generateTextFromInfo('Reactant', info.desc.reactants);
      productDescs = generateTextFromInfo('Product', info.desc.products);
    }

    row.push(smiArr.join('>'));
    row.push(solventsAdded);

    row.push(temperature.filter(x => x).join(';'));
    row.push(reactionYield.filter(x => x).join(';'));
    row.push(time.filter(x => x).join(';'));
    row.push(reactionDesc.filter(x => x).join('\n'));

    row.push(reactantDescs);
    row.push(productDescs);

    return row;
  }
};

module.exports = ChemReadObjectHelper;
