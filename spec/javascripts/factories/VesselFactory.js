import { factory } from 'factory-bot';
import Vessel from 'src/models/Vessel';

export default class VesselFactory {
  static instance = undefined;

  static build(...args) {
    if (VesselFactory.instance === undefined) {
      VesselFactory.instance = new VesselFactory();
    }
    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('new', Vessel, async () => {
      const vessel = Vessel.buildEmpty(0);
      return vessel;
    });

    this.factory.define('with_name', Vessel, async () => {
      const vessel = Vessel.buildEmpty(0);
      vessel.vessel_name = 'Vessel 1';
      vessel.vessel_id = 1;
      return vessel;
    });

    this.factory.define('with_other_name', Vessel, async () => {
      const vessel = Vessel.buildEmpty(0);
      vessel.vessel_name = 'Vessel 2';
      vessel.vessel_id = 2;
      return vessel;
    });
  }
}