import Element from './Element';
import DeviceAnalysis from './DeviceAnalysis';
import DeviceSample from './DeviceSample';

export default class Device extends Element{
  constructor({id, title, code, types, user_id, samples, devices_analyses}) {
    const device = {
      id,
      title,
      code,
      types,
      user_id,
      type: 'device',
      samples: samples.map(s => new DeviceSample(s)),
      devicesAnalyses: devices_analyses.map(analysis => new DeviceAnalysis(analysis))
    }
    super(device)
  }
  
  checksum() {
    return super.checksum(
      ['user_id', 'id', 'is_new', 'isNew', 'isEdited', 'isPendingToSave']
    )
  }

  static buildEmpty() {
    return new Device({
      type: 'device',
      code: "",
      types: [],
      samples: [],
      title: "New Device",
      devices_analyses: []
    })
  }
  
  serialize() {
    const serialized = super.serialize({ 
      id: this.id,
      code: this.code,
      types: this.types,
      samples: this.samples.map(s => s.serialize()),
      title: this.title,
    })
    return serialized
  }
}
