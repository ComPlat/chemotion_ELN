import { factory } from '@eflexsystems/factory-bot';
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

    this.factory.define('empty', Sample, async () => Sample.buildEmpty(0));

    this.factory.define('SampleFactory.water_100g', Sample, async () => {
      const sample = Sample.buildEmpty(0);
      sample.amount_value = 100;
      sample.molecule = new Molecule();
      sample.molecule.exact_molecular_weight = 18.010564684;
      sample.molecule.molecular_weight = 18.010564684;
      sample.amountType = 'target';
      sample.amount_unit = 'g';
      sample.coefficient = 1;
      sample.is_new = false;

      return sample;
    });

    this.factory.define('reactionConcentrations.water_100g', Sample, async () => {
      const sample = Sample.buildEmpty(0);
      sample.amount_value = 2;
      sample.molecule = new Molecule();
      sample.molecule.exact_molecular_weight = 18.010564684;
      sample.molecule.molecular_weight = 18.010564684;
      sample.amountType = 'target';
      sample.amount_unit = 'l'; // <-- 'l' for liters here
      sample.coefficient = 1;
      sample.is_new = false;

      return sample;
    });

    this.factory.extend('empty', 'Ethanol_5ml', {
      target_amount_value: 5,
      real_amount_value: 5,
      molecule: {
        molecular_weight: 46.0688,
      },
      target_amount_unit: 'l', // <-- 'ml' for milliliters here
      real_amount_unit: 'l',
      metrics: 'mmmm', // <-- 'ml' for milliliters here
      coefficient: 1,
      is_new: false,
      density: 0.789, // Ethanol density in g/ml
    });
  }

  static buildMany(...args) {
    if (SampleFactory.instance === undefined) {
      SampleFactory.instance = new SampleFactory();
    }
    return this.instance.factory.buildMany(...args);
  }
}
