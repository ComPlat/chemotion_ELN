import Element from 'src/models/Element';

export default class Graph extends Element {
  static buildEmptyScatter() {
    return new Graph({ type: 'graph', graphType: 'scatter' });
  }
}
