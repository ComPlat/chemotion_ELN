import Element from './Element'
import AnalysesExperiment from './AnalysesExperiment'

export default class DeviceAnalysis extends Element{
  constructor({
     id, sample_id, device_id, analysis_type, title, experiments
  }) {
    const device = {
      id: id,
      sampleId: sample_id,
      deviceId: device_id,
      experiments: experiments.map((e) => new AnalysesExperiment(e, sample_id)),
      type: 'deviceAnalysis',
      analysisType: analysis_type,
      title,
      activeAccordionExperiment: 0,
    }
    super(device)
  }

  static buildEmpty(sample, analysisType) {
    return new DeviceAnalysis({
      type: 'deviceAnalysis',
      sample_id: sample.id,
      analysis_type: analysisType,
      title: "",
      experiments: []
    })
  }
}
