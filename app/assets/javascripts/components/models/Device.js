import Element from './Element';
import Sample from './Sample';
import uuid from 'uuid';

export default class Device extends Element{
  constructor({id, title, code, types, user_id, samples, devices_analyses}) {
    const device = {
    id,
    title,
      code,
      types,
      user_id,
      type: 'device',
      samples: samples.map(sample => new Sample(sample)),
      devicesAnalyses: devices_analyses
    }
    super(device)
  }
  
  checksum() {
    return super.checksum(
      ['user_id', 'id', 'is_new']
    )
  }

  static buildEmpty() {
    return new Device({
      type: 'device',
      code: "",
      types: [],
      samples: [],
      title: "New Device",
      devicesAnalyses: []
    })
  }
}
