import Element from './Element';
import Dataset from './Dataset';

export default class Analysis extends Element {
  static buildEmpty() {
    return new Analysis({
      name: 'new Analysis',
      type: 'analysis',
      kind: '',
      status: '',
      content: '',
      description: '',
      datasets: [],
      bar_code: null,
      qr_code: null,
      bar_code_bruker: null
    })
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get type() {
    return this._type;
  }

  set type(type) {
    this._type = type;
  }

  get datasets() {
    return this._datasets || [];
  }

  set datasets(datasets) {
    this._datasets = datasets.map(dataset => new Dataset(dataset));
  }

  updateDataset(changedDataset) {
    this._datasets.find(dataset => {
      if(dataset.id == changedDataset.id) {
        const datasetId = this.datasets.indexOf(dataset);
        this.datasets[datasetId] = changedDataset;
      }
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      kind: this.kind,
      status: this.status,
      content: this.content,
      description: this.description,
      datasets: this.datasets.map(d => d.serialize()),
      bar_code: this.barcode,
      qr_code: this.qr_code,
      bar_code_bruker: this.bar_code_bruker
    })
  }

}
