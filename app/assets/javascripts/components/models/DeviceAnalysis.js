import Element from './Element'
import Sample from './Sample'

export default class DeviceAnalysis extends Element{
  constructor({
    holderId, status, name, solvent, experiment, checkbox, day,
    numberOfScans, numeric, time, analysisType
  }) {
    const device = {
      holderId,
      status,
      name,
      solvent,
      experiment,
      checkbox,
      day,
      numberOfScans,
      numeric,
      time,
      type: 'deviceAnalysis',
      analysisType
    }
    super(device)
  }

  static buildEmpty(sample, analysisType) {
    return new DeviceAnalysis({
      holderId: null,
      status: "",
      name: sample.id,
      solvent: "",
      experiment: "",
      checkbox: false,
      day: true,
      numberOfScans: 0,
      numeric: 0,
      time: "",
      type: 'deviceAnalysis',
      analysisType
    })
  }
}
