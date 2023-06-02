import { factory } from 'factory-bot';
import Reaction from 'src/models/Reaction';
import SampleFactory from 'factories/SampleFactory';

export default class ReactionFactory {
  static instance = undefined;

  static build(...args) {
    if (ReactionFactory.instance === undefined) {
      ReactionFactory.instance = new ReactionFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('water+water=>water+water', Reaction, async () => {
      const startingMaterial_1 = await SampleFactory.build('water_100g');
      startingMaterial_1.coefficient = 1;
      const startingMaterial_2 = await SampleFactory.build('water_100g');
      startingMaterial_1.coefficient = 5;
      const product_1 = await SampleFactory.build('water_100g');
      product_1.coefficient = 2;
      const product_2 = await SampleFactory.build('water_100g');
      product_2.coefficient = 4;

      const reaction = Reaction.buildEmpty();
      reaction.starting_materials = [startingMaterial_1, startingMaterial_2];
      reaction.products = [product_1, product_2];

      return reaction;
    });
  }
}
