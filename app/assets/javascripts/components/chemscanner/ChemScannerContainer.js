import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
import _ from 'lodash';
import 'whatwg-fetch';
import XLSX from 'xlsx';

import ChemScannerFetcher from './ChemScannerFetcher';
import ChemScanner from './ChemScanner';
import {
  generateExcelReactionRow, generateExcelMoleculeRow
} from './ChemScannerObjectHelper';

export default class ChemScannerContainer extends React.Component {
  constructor() {
    super();
    this.state = {
      files: [],
      getMol: false,
      abbManagement: false,
      selected: []
    };

    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.selectSmi = this.selectSmi.bind(this);
    this.removeSmi = this.removeSmi.bind(this);
    this.exportSmi = this.exportSmi.bind(this);
    this.exportExcel = this.exportExcel.bind(this);
    this.exportCml = this.exportCml.bind(this);
    this.editSmiles = this.editSmiles.bind(this);
    this.editComment = this.editComment.bind(this);
    this.changeType = this.changeType.bind(this);
    this.changeAbbManagement = this.changeAbbManagement.bind(this);

    this.setCdd = this.setCdd.bind(this);
    this.getSvg = this.getSvg.bind(this);
  }

  getSvg(uid, idx) {
    if (!this.cddInstance) return;

    const { files } = this.state;
    const cfiles = _.cloneDeep(files);

    const file = cfiles.filter(x => x.uid === uid);
    if (file.length === 0) return;

    const cd = file[0].cds[idx];
    if (!cd) return;

    cd.svg = this.cddInstance.getImgUrl();
    this.cddInstance.clear();
    this.setState({ files: cfiles });
  }

  setCdd(cdd) {
    this.cddInstance = cdd;
  }

  addFile(newFiles) {
    const fileArr = [];
    newFiles.forEach((file) => {
      const fileObj = {};
      fileObj.uid = uuid.v1();
      fileObj.name = file.name;
      fileObj.file = file;
      fileArr.push(fileObj);
    });

    let scannedArr = [];
    const { getMol, files } = this.state;
    ChemScannerFetcher.fetchInfo(fileArr, getMol).then((res) => {
      scannedArr = [].concat(res.embedded);
      this.setState({ files: files.concat(scannedArr) });

      if (!this.cddInstance) return;

      scannedArr.forEach((scanned) => {
        scanned.cds.forEach((cd, idx) => {
          if (cd.b64cdx) {
            this.cddInstance.loadB64CDX(cd.b64cdx, () => this.getSvg(scanned.uid, idx));
          } else if (cd.cdxml) {
            this.cddInstance.loadCDXML(cd.cdxml);
            this.getSvg(scanned.uid, idx);
          }
        });
      });
    });
  }

  removeFile(file) {
    const { selected, files } = this.state;
    let newFiles = _.cloneDeep(files);
    let newSelected = _.cloneDeep(selected);
    newFiles = newFiles.filter(x => x.uid !== file.uid);
    newSelected = newSelected.filter(x => x.uid !== file.uid);

    this.setState({ files: newFiles, selected: newSelected });
  }

  selectSmi(uid, cdIdx, smiIdx) {
    const { selected } = this.state;
    const newSelected = _.cloneDeep(selected);
    const s = newSelected.findIndex(
      x => x.uid === uid && x.cdIdx === cdIdx && x.smiIdx === smiIdx
    );

    if (s >= 0) {
      newSelected.splice(s, 1);
    } else {
      newSelected.push({ uid, cdIdx, smiIdx });
    }

    this.setState({ selected: newSelected });
  }

  removeSmi(obj) {
    const { uid, cdIdx, idx } = obj;
    const { files } = this.state;
    const newFiles = _.cloneDeep(files);
    const fileIdx = newFiles.findIndex(x => x.uid === uid);
    if (fileIdx < 0 || !newFiles[fileIdx].cds) return;

    newFiles[fileIdx].cds[cdIdx].info.splice(idx, 1);
    this.setState({ files: newFiles });
  }

  exportExcel(objects) {
    const { getMol } = this.state;
    let rows = [];

    if (getMol) {
      const headerRow = [
        'Smiles', 'Description',
      ];
      rows.push(headerRow);
      rows = rows.concat(objects.map(x => generateExcelMoleculeRow(x)));
    } else {
      const headerRow = [
        'ReactionSmiles', 'Solvents',
        'Temperature', 'Yield', 'Time', 'Description',
        'StartingMaterialsDescription', 'ProductsDescription',
        'Reactants SDF', 'Reagents SDF', 'Products SDF'
      ];
      rows.push(headerRow);
      rows = rows.concat(objects.map(x => generateExcelReactionRow(x)));
    }

    const wb = {};
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wsName = 'ChemScanner';

    wb.SheetNames = [];
    wb.Sheets = {};
    wb.SheetNames.push(wsName);
    wb.Sheets[wsName] = ws;

    XLSX.writeFile(wb, 'chemscanner.xlsx', { bookSST: true });
  }

  exportCml(objects) {
    const { getMol } = this.state;
    let objs = objects;

    if (!getMol) {
      objs = objects.map((obj) => {
        const { reaction } = obj.description;
        const reactants = Object.keys(obj.description).reduce((acc, dkey) => {
          if (!dkey.startsWith('reactant')) return acc;

          acc.push(obj.description[dkey]);
          return acc;
        }, []);
        const products = Object.keys(obj.description).reduce((acc, dkey) => {
          if (!dkey.startsWith('product')) return acc;

          acc.push(obj.description[dkey]);
          return acc;
        }, []);

        return {
          reactants,
          products,
          reagents_smiles: obj.reagents_smiles,
          yield: reaction.yield || '',
          time: reaction.time || '',
          temperature: reaction.temperature || '',
          description: reaction.description
        };
      });
    }

    ChemScannerFetcher.getCml(objs, getMol).then((json) => {
      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(new Blob([json]));
      a.href = url;
      a.download = 'chemscanner.cml';
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  exportSmi(obj) {
    const exportType = obj.type;
    const { files, getMol } = this.state;
    const filesWithComment = _.cloneDeep(files);

    const { selected } = this.state;
    const selectedObjects = [];
    const nonSelectedObjects = [];

    filesWithComment.forEach((file) => {
      file.cds.forEach((cd, cdIdx) => {
        cd.info.forEach((inf, smiIdx) => {
          /* eslint-disable no-param-reassign */
          if (inf.comment) {
            inf.description.reaction.description += `\n${inf.comment}`;
          }
          if (inf.editedSmi) {
            inf.reagents_smiles = inf.reagents_smiles.concat(inf.editedSmi);
          }
          /* eslint-enable no-param-reassign */
          const sIdx = selected.findIndex(s => (
            s.uid === file.uid && s.cdIdx === cdIdx && s.smiIdx === smiIdx
          ));

          if (sIdx < 0) {
            nonSelectedObjects.push(inf);
          } else {
            selectedObjects.push(inf);
          }
        });
      });
    });

    const objects = selectedObjects.length === 0
      ? nonSelectedObjects
      : selectedObjects;

    objects.forEach((info) => {
      const { description, details } = info;

      if (details) {
        if (getMol) {
          const valText = Object.keys(details).reduce((acc, dkey) => {
            if (details[dkey]) acc.push(`  - ${dkey}: ${details[dkey]}`);
            return acc;
          }, []).join('\n');

          const linker = description ? `${description}\n` : '';
          // eslint-disable-next-line no-param-reassign
          info.description = linker + valText;
        } else {
          const { reaction } = description;
          Object.keys(details).forEach((dkey) => {
            const val = details[dkey];
            let valText = '';
            if (val.constructor === Array) {
              valText = val.reduce((acc, vObj) => {
                const vText = Object.keys(vObj).reduce((vacc, vkey) => {
                  if (val[vkey]) vacc.push(`  - ${vkey}: ${val[vkey]}`);
                  return vacc;
                }, []).join('\n');

                acc.push(vText);
                return acc;
              }, []).join('\n');
            } else {
              valText = Object.keys(val).reduce((acc, vkey) => {
                if (val[vkey]) acc.push(`  - ${vkey}: ${val[vkey]}`);
                return acc;
              }, []).join('\n');
            }

            if (description[dkey]) {
              const { text } = description[dkey];
              const linker = text ? `${text}\n` : '';
              description[dkey].text = linker + valText;
            } else {
              const rdesc = reaction.description;
              const linker = rdesc ? `${rdesc}\n` : '';
              reaction.description = linker + valText;
            }
          });
        }
      }
    });

    if (exportType === 'cml') {
      this.exportCml(objects);
    } else if (exportType === 'excel') {
      this.exportExcel(objects);
    }
  }

  changeType() {
    const { getMol } = this.state;
    this.setState({ getMol: !getMol });
  }

  changeAbbManagement() {
    const { abbManagement } = this.state;
    this.setState({ abbManagement: !abbManagement });
  }

  editSmiles(solventSmi) {
    const { files } = this.state;
    const newFiles = _.cloneDeep(files);
    const { selected } = this.state;
    const addedSmi = [];

    selected.forEach((s) => {
      const file = newFiles.filter(x => x.uid === s.uid);
      const info = file[0].cds[s.cdIdx].info[s.smiIdx];

      if (!info.editedSmi) info.editedSmi = [];
      info.editedSmi = solventSmi;

      addedSmi.push({
        uid: s.uid,
        cdIdx: s.cdIdx,
        smiIdx: s.smiIdx,
        info: {
          reactants_smiles: info.reactants_smiles,
          reactants_mdl: info.reactants_mdl,
          products_smiles: info.products_smiles,
          products_mdl: info.products_mdl,
          reagents_smiles: info.reagents_smiles.concat(info.editedSmi),
          reagents_mdl: info.reagents_mdl,
        }
      });
    });

    ChemScannerFetcher.fetchSvgFromSmis(addedSmi).then((r) => {
      r.svg.forEach((svgInfo) => {
        const file = newFiles.filter(x => x.uid === svgInfo.uid)[0];
        if (!file) return;
        const info = file.cds[svgInfo.cdIdx].info[svgInfo.smiIdx];
        info.svg = svgInfo.svg;
        info.smi = svgInfo.smi;
      });

      this.setState({ files: newFiles });
    });
  }

  editComment(uid, cdIdx, idx, comment) {
    const { files } = this.state;
    const newFiles = _.cloneDeep(files);
    const file = newFiles.filter(x => x.uid === uid);
    const info = file[0].cds[cdIdx].info[idx];
    info.comment = comment;

    this.setState({ files: newFiles });
  }

  render() {
    const {
      files, selected, getMol, abbManagement
    } = this.state;
    const { modal } = this.props;

    return (
      <div>
        <ChemScanner
          modal={modal}
          files={files}
          selected={selected}
          getMol={getMol}
          addFile={this.addFile}
          abbManagement={abbManagement}
          removeFile={this.removeFile}
          editSmiles={this.editSmiles}
          selectSmi={this.selectSmi}
          removeSmi={this.removeSmi}
          exportSmi={this.exportSmi}
          editComment={this.editComment}
          changeType={this.changeType}
          changeAbbManagement={this.changeAbbManagement}
          setCdd={this.setCdd}
        />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const chemScannerDOM = document.getElementById('ChemScanner');
  if (chemScannerDOM) ReactDOM.render(<ChemScannerContainer />, chemScannerDOM);
});
