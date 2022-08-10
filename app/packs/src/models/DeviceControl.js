import Element from 'src/models/Element';

export default class DeviceControl extends Element {

  static buildEmpty() {
    return new DeviceControl({
      type: 'deviceCtrl',
    })
  }

}
