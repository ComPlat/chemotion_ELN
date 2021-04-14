import Element from './Element'
import AnalysesExperiment from './AnalysesExperiment'
import _ from 'lodash'

export default class DeviceAnalysis extends Element{
  constructor({
     id, device_id, analysis_type, title, experiments
  }) {
    const analysis = {
      id: id,
      deviceId: device_id,
      experiments: experiments.map((e) => new AnalysesExperiment(e)),
      type: 'deviceAnalysis',
      analysisType: analysis_type,
      title,
    }
    super(analysis)
  }

  static buildEmpty(deviceId, analysisType) {
    return new DeviceAnalysis({
      device_id: deviceId,
      experiments: [],
      type: 'deviceAnalysis',
      analysis_type: analysisType,
      title: `${deviceId}: NMR`,
    })
  }
 
  serialize() {
    const serialized = super.serialize({
      device_id: this.deviceId,
      experiments: this.experiments.map((e) => e.serialize()),
      analysis_type: this.analysisType,
      title: this.title,
    })
    return serialized 
  }
}
