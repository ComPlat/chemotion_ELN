import Element from 'src/models/Element';

export default class Prediction extends Element {
  static buildEmpty() {
    const prediction = new Prediction({
      type: 'prediction',
    });

    return prediction;
  }
}
