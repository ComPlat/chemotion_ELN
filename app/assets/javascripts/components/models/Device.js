import Element from './Element';
import DeviceAnalysis from './DeviceAnalysis';

export default class Device extends Element{
  constructor({id, title, code, types, user_id, samples, devices_analyses}) {
    const device = {
      id,
      title,
      code,
      types,
      user_id,
      type: 'device',
      samples: samples,
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
}
