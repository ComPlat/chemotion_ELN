import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
// import JSZip from 'jszip';
// import _ from 'lodash';
import 'whatwg-fetch';

import Docx from './Docx';
import NotificationActions from '../components/actions/NotificationActions';

// function unzipFile(file, fn) {
//   const unzip = new JSZip();
//   return unzip.loadAsync(file).then(unzipped => fn(unzipped));
// }

// function unzipDocx(file) {
//   const reg = /word\/embeddings\/.*\.bin/;
//   const keys = Object.keys(file.files).filter(x => x.match(reg) !== null);
//   const arr = [];
//   keys.forEach(k => arr.push(file.files[k]));
//   return arr;
// }

function fetchRsmi(files) {
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

class DocxContainer extends Component {
  constructor() {
    super();
    this.state = {
      files: []
    };

    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
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
    fetchRsmi(fileArr).then((res) => {
      rsmis = [].concat(res.embedded);
      this.setState({ files: this.state.files.concat(rsmis) });
    });
  }

  removeFile(file) {
    let files = [...this.state.files];
    files = files.filter(x => x.uid !== file.uid);
    this.setState({ files });
  }

  render() {
    const { files } = this.state;

    return (
      <div>
        <Docx
          files={files}
          addFile={this.addFile}
          removeFile={this.removeFile}
        />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<DocxContainer />, document.getElementById('Docx'));
});
