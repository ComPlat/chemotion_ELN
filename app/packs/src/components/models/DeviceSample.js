import Element from './Element';
import uuid from 'uuid';

export default class DeviceSample extends Element{
  constructor({id, device_id, sample_id, types, short_label}) {
    const deviceSample= {
      id,
      deviceId: device_id,
      sampleId: sample_id,
      types,
      shortLabel: short_label,
    }
    super(deviceSample)
  }
  
  static buildEmpty(deviceId, sample) {
    return new DeviceSample({
      id: uuid.v1(),
      device_id: deviceId,
      sample_id: sample.id,
      short_label: sample.short_label,
      types: [],
    })
  }
  
  serialize() {
    const serialized = super.serialize({ 
      id: this.id,
      device_id: this.deviceId,
      sample_id: this.sampleId,
      types: this.types,
    })
    return serialized
  }
}
