import { solvents } from '../staticDropdownOptions/reagents/solvents';

const ChemScannerObjectHelper = {
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
  generateExcelReactionRow(info) {
    const {
      description, reactants_mdl, reagents_mdl, products_mdl
    } = info;
    const { reaction } = description;

    const solventsAdded = (info.editedSmi || []).filter(x => (
      Object.values(solvents).indexOf(x) > -1
    )).join(',');

    const reactantDescs = Object.keys(description).reduce((acc, dkey) => {
      if (dkey.startsWith('reactant')) {
        acc.push(dkey);
        acc.push(`  ${description[dkey].text}`);
      }

      return acc;
    }, []).join('\n');
    const productDescs = Object.keys(description).reduce((acc, dkey) => {
      if (dkey.startsWith('product')) {
        acc.push(dkey);
        acc.push(`  ${description[dkey].text}`);
      }

      return acc;
    }, []).join('\n');

    const row = [];
    row.push(info.smi);
    row.push(solventsAdded);
    row.push(reaction.temperature);
    row.push(reaction.yield);
    row.push(reaction.time);
    row.push(reaction.description);
    row.push(reactantDescs);
    row.push(productDescs);
    row.push(reactants_mdl.join('\n$$$$\n'));
    row.push(reagents_mdl.join('\n$$$$\n'));
    row.push(products_mdl.join('\n$$$$\n'));

    return row;
  },
  generateExcelMoleculeRow(info) {
    return [
      info.smi,
      info.description
    ];
  },
};

module.exports = ChemScannerObjectHelper;
