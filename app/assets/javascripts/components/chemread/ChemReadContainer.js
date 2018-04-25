import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
import _ from 'lodash';
import 'whatwg-fetch';
import XLSX from 'xlsx';

import { solvents } from '../staticDropdownOptions/reagents/solvents';

import ChemRead from './ChemRead';
import NotificationActions from '../actions/NotificationActions';

function fetchInfo(files, getMol) {
  const data = new FormData();
  data.append('get_mol', getMol);
  files.forEach(file => data.append(file.uid, file.file));

  return fetch('/api/v1/chemread/embedded/upload', {
    credentials: 'same-origin',
    method: 'post',
    body: data
  }).then((response) => {
    if (response.ok === false) {
      let msg = 'Files uploading failed: ';
      if (response.status === 413) {
        msg += 'File size limit exceeded. Max size is 50MB';
      } else {
        msg += response.statusText;
      }

      NotificationActions.add({
        message: msg,
        level: 'error'
      });
    }
    return response.json();
  });
}

function fetchSvgFromSmis(smiArr) {
  return fetch('/api/v1/chemread/svg/smi', {
    credentials: 'same-origin',
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ smiArr })
  }).then((response) => {
    if (response.ok === false) {
      let msg = 'Files uploading failed: ';
      if (response.status === 413) {
        msg += 'File size limit exceeded. Max size is 50MB';
      } else {
        msg += response.statusText;
      }

      NotificationActions.add({
        message: msg,
        level: 'error'
      });
    }
    return response.json();
  });
}

function generateTextFromInfo(name, info) {
  if (!info) return '';

  const descArr = [];

  Object.keys(info).forEach((key) => {
    const desc = info[key];
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
}

function generateExportRow(info) {
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

class ChemReadContainer extends React.Component {
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
    fetchInfo(fileArr, this.state.getMol).then((res) => {
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

    fetchSvgFromSmis(addedSmi).then((r) => {
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
