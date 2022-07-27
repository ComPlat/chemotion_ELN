import Element from 'src/components/models/Element';

export default class DeviceControl extends Element{

  static buildEmpty() {
    return new DeviceControl({
      type: 'deviceCtrl',
    })
  }

}
