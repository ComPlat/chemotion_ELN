import Element from './Element';
import Dataset from './Dataset';

export default class Analysis extends Element {
  static buildEmpty() {
    const content_default = { "ops": [{ "insert": "" }] }
    return new Analysis({
      name: 'new Analysis',
      type: 'analysis',
      report: true,
      kind: '',
      status: '',
      content: content_default,
      description: '',
      datasets: []
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
      report: this.report,
      kind: this.kind,
      status: this.status,
      content: this.content,
      description: this.description,
      datasets: this.datasets.map(d => d.serialize())
    })
  }

}
