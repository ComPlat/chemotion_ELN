import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
import _ from 'lodash';
import 'whatwg-fetch';
import XLSX from 'xlsx';

import ChemReadFetcher from './ChemReadFetcher';
import ChemRead from './ChemRead';
import { generateExportRow } from './ChemReadObjectHelper';

export default class ChemReadContainer extends React.Component {
  constructor() {
    super();
    this.state = {
      files: [],
      getMol: false,
      selected: []
    };

    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.selectSmi = this.selectSmi.bind(this);
    this.removeSmi = this.removeSmi.bind(this);
    this.exportSmi = this.exportSmi.bind(this);
    this.editSmiles = this.editSmiles.bind(this);
    this.changeType = this.changeType.bind(this);
  }

  addFile(files) {
    const fileArr = [];
    files.forEach((file) => {
      const fileObj = {};
      fileObj.uid = uuid.v1();
      fileObj.name = file.name;
      fileObj.file = file;
      fileArr.push(fileObj);
    });

    let rsmis = [];
    ChemReadFetcher.fetchInfo(fileArr, this.state.getMol).then((res) => {
      rsmis = [].concat(res.embedded);
      this.setState({ files: this.state.files.concat(rsmis) });
    });
  }

  removeFile(file) {
    let files = _.cloneDeep(this.state.files);
    let selected = _.cloneDeep(this.state.selected);
    files = files.filter(x => x.uid !== file.uid);
    selected = selected.filter(x => x.uid !== file.uid);

    this.setState({ files, selected });
  }

  selectSmi(uid, smiIdx) {
    const selected = [...this.state.selected];
    const s = selected.findIndex(x => x.uid === uid && x.smiIdx === smiIdx);
    if (s >= 0) {
      selected.splice(s, 1);
    } else {
      selected.push({ uid, smiIdx });
    }

    this.setState({ selected });
  }

  removeSmi(obj) {
    const { uid, idx } = obj;
    const files = [...this.state.files];
    const fileIdx = files.findIndex(x => x.uid === uid);
    files[fileIdx].info.splice(idx, 1);
    this.setState({ files });
  }

  exportSmi(obj) {
    const exportAll = obj.all;
    const files = [...this.state.files];

    const headerRow = [
      'ReactionSmiles', 'Solvents',
      'Temperature', 'Yield', 'Time', 'Description',
      'StartingMaterialsDescription', 'ProductsDescription'
    ];
    let rows = [headerRow];

    if (exportAll) {
      files.forEach((val) => {
        const smis = val.info.map(x => generateExportRow(x));
        rows = rows.concat(smis);
      }, []);
    } else {
      const selected = [...this.state.selected];
      selected.forEach((x) => {
        const fileIdx = files.findIndex(f => f.uid === x.uid);
        const smis = generateExportRow(files[fileIdx].info[x.smiIdx]);
        rows.push(smis);
      });
    }

    const wb = {};
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wsName = 'ChemRead';

    wb.SheetNames = [];
    wb.Sheets = {};
    wb.SheetNames.push(wsName);
    wb.Sheets[wsName] = ws;

    XLSX.writeFile(wb, 'chemread.xlsx', { bookSST: true });
  }

  changeType() {
    this.setState({ getMol: !this.state.getMol });
  }

  editSmiles(solventSmi) {
    const files = _.cloneDeep(this.state.files);
    const { selected } = this.state;
    const addedSmi = [];

    selected.forEach((s) => {
      const file = files.filter(x => x.uid === s.uid);
      const info = file[0].info[s.smiIdx];
      const solventSmiArr = solventSmi.split(',').filter(x => x);

      let newEditedSmi = solventSmiArr;
      if (selected.length > 1) {
        newEditedSmi = (info.editedSmi || '').split(',').concat(solventSmiArr);
      }
      newEditedSmi = [...new Set(newEditedSmi)];
      info.editedSmi = newEditedSmi.filter(x => x).join(',');

      const smiArr = info.smi.split('>');
      let newSolvents = smiArr[1].split('.').concat(newEditedSmi);
      newSolvents = [...new Set(newSolvents)];
      smiArr[1] = newSolvents.filter(x => x).join('.');
      const newSmi = smiArr.join('>');
      addedSmi.push({ uid: s.uid, smiIdx: s.smiIdx, newSmi });
    });

    ChemReadFetcher.fetchSvgFromSmis(addedSmi).then((r) => {
      r.svg.forEach((svgInfo) => {
        const file = files.filter(x => x.uid === svgInfo.uid)[0];
        if (!file) return;
        file.info[svgInfo.smiIdx].svg = svgInfo.svg;
      });

      this.setState({ files });
    });
  }

  render() {
    const { files, selected, getMol } = this.state;

    return (
      <div>
        <ChemRead
          files={files}
          selected={selected}
          getMol={getMol}
          addFile={this.addFile}
          removeFile={this.removeFile}
          editSmiles={this.editSmiles}
          selectSmi={this.selectSmi}
          removeSmi={this.removeSmi}
          exportSmi={this.exportSmi}
          changeType={this.changeType}
        />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const chemReadDOM = document.getElementById('ChemRead');
  if (chemReadDOM) ReactDOM.render(<ChemReadContainer />, chemReadDOM);
});
