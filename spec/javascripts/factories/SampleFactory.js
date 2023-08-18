import { factory } from 'factory-bot';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';

export default class SampleFactory {
  static instance = undefined;

  static build(...args) {
    if (SampleFactory.instance === undefined) {
      SampleFactory.instance = new SampleFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('water_100g', Sample, async () => {
      const sample = Sample.buildEmpty(0);
      sample.amount_value = 100;
      sample.molecule = new Molecule();
      sample.molecule.exact_molecular_weight = 18.010564684;
      sample.molecule.molecular_weight = 18.010564684;
      sample.amountType = 'target';
      sample.amount_unit = 'g';
      sample.coefficient = 1;

      return sample;
    });
  }
}
