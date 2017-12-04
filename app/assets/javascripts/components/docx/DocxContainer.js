import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
import _ from 'lodash';
import 'whatwg-fetch';

import Docx from './Docx';
import NotificationActions from '../actions/NotificationActions';

function fetchRsmiAndSvg(files) {
  const data = new FormData();
  files.forEach(file => data.append(file.uid, file.file));

  return fetch('/api/v1/docx/embedded/upload', {
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
  return fetch('/api/v1/docx/svg/smi', {
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

class DocxContainer extends React.Component {
  constructor() {
    super();
    this.state = {
      files: [],
      selected: []
    };

    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.selectSmi = this.selectSmi.bind(this);
    this.editSmiles = this.editSmiles.bind(this);
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
    fetchRsmiAndSvg(fileArr).then((res) => {
      rsmis = [].concat(res.embedded);
      this.setState({ files: this.state.files.concat(rsmis) });
    });
  }

  removeFile(file) {
    let files = [...this.state.files];
    files = files.filter(x => x.uid !== file.uid);
    this.setState({ files });
  }

  selectSmi(uid, rsmiIdx) {
    const selected = [...this.state.selected];
    const s = selected.findIndex(x => x.uid === uid && x.rsmiIdx === rsmiIdx);
    if (s >= 0) {
      selected.splice(s, 1);
    } else {
      selected.push({ uid, rsmiIdx });
    }

    this.setState({ selected });
  }

  editSmiles(solventSmi) {
    const files = _.cloneDeep(this.state.files);
    const { selected } = this.state;
    const addedSmi = [];

    selected.forEach((s) => {
      const file = files.filter(x => x.uid === s.uid);
      if (!file) return;
      const smiArr = file[0].rsmi[s.rsmiIdx].smi.split('>');
      /* const curSolventSmi = smiArr[1] === '' ? '' : `${smiArr[1]}.`;
       * smiArr[1] = curSolventSmi.concat(`${solventSmi}`); */
      smiArr[1] = solventSmi;
      const newSmi = smiArr.join('>');
      file[0].rsmi[s.rsmiIdx].smi = newSmi;
      addedSmi.push({ uid: s.uid, rsmiIdx: s.rsmiIdx, newSmi });
    });

    fetchSvgFromSmis(addedSmi).then((r) => {
      r.svg.forEach((svgInfo) => {
        const file = files.filter(x => x.uid === svgInfo.uid)[0];
        if (!file) return;
        file.rsmi[svgInfo.rsmiIdx].svg = svgInfo.svg;
      });

      this.setState({ files });
    });
  }

  render() {
    const { files, selected } = this.state;

    return (
      <div>
        <Docx
          files={files}
          selected={selected}
          addFile={this.addFile}
          removeFile={this.removeFile}
          editSmiles={this.editSmiles}
          selectSmi={this.selectSmi}
        />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<DocxContainer />, document.getElementById('Docx'));
});
