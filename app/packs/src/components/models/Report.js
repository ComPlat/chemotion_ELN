import Element from 'src/components/models/Element';

export default class Report extends Element {
  static buildEmpty() {
    let report = new Report({
      type: 'report'
    });

    return report;
  }
}
