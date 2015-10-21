import Element from './Element';
import Dataset from './Dataset';

export default class Analysis extends Element {
  static buildEmpty() {
    return new Analysis({
      name: 'new Analysis',
      type: 'analysis',
      status: '',
      content: '',
      description: '',
      datasets: []
    })
  }

  get datasets() {
    return this._datasets;
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
      status: this.status,
      content: this.content,
      description: this.description,
      datasets: this.datasets.map(d => d.serialize())
    })
  }

}
