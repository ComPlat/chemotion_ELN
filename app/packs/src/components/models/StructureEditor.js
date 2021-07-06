// import _ from 'lodash';
import uuid from 'uuid';

export default class StructureEditor {
  constructor(args) {
    Object.assign(this, args);

    if (!this.id) {
      this.id = StructureEditor.buildID();
    }

    if (!this.getMolfileFunction) {
      this.getMolfileFunction = this.defaultGetMolfileFunction;
    }
  }

  static buildID() {
    return uuid.v1();
  }

  defaultGetMolfileFunction() {
    return new Promise((resolve) => {
      const mf = this.editor.getMolfile();
      resolve(mf);
    });
  }

  getEditor() {
    const frame = document.getElementById(this.id);
    if (frame && ('contentDocument' in frame)) {
      return frame.contentWindow[this.path];
    }
    return document.frames[this.id].window[this.path];
  }

  get editor() {
    return this.getEditorFunction ? this.getEditorFunction() : this.getEditor();
  }

  // Molfile
  get molfile() {
    const func = this.editor[this.getMfFuncName];
    let result;
    if (!func) { return null; }
    if (this.getMfWithCallback) {
      this.editor[this.getMfFuncName]((a) => { result = a; });
    } else {
      result = func();
    }
    return result;
  }

  set molfile(mf) {
    if (this.setMolfileInFrame) {
      const frame = document.getElementById(this.id);
      if (frame && ('contentDocument' in frame)) {
        if (frame.contentWindow[this.setMolfileInFrame] && mf) {
          frame.contentWindow[this.setMolfileInFrame] = mf;
        }
      }
    } else {
      this.editor[this.setMfFuncName](mf);
    }
  }

  // SVG
  get svg() {
    const func = this.editor[this.getSVGFuncName];
    let result;
    if (!func) { return null; }
    if (this.getSVGWithCallback) {
      this.editor[this.getSVGFuncName]((a) => { result = a; });
    } else {
      result = func();
    }
    return result;
  }

  fetchSVG() {
    const func = this.editor[this.getSVGFuncName];
    return new Promise((resolve, reject) => {
      if (!func) { reject(new Error(`get ${'svg'} method missing`)); }
      if (this.getSVGWithCallback) {
        this.editor[this.getSVGFuncName]((a) => { resolve(a); });
      } else {
        resolve(func());
      }
    });
  }
  // Smiles
  get smiles() {
    const func = this.editor[this.getSmiFuncName];
    if (!func) { return null; }
    let result;
    if (this.getSmiWithCallback) {
      this.editor[this.getSmiFuncName]((a) => { result = a; });
    } else {
      result = func();
    }
    return result;
  }

  // molecule info
  get info() {
    return (
      {
        smiles: this.smiles || '',
        inchikey: '',
        inchi: '',
      }
    );
  }
}
