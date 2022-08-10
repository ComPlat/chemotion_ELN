import Element from 'src/models/Element';

export default class ComputeTask extends Element {
  static buildEmpty() {
    return new ComputeTask({ type: 'task' });
  }
}
