import Element from './Element'

export default class AnalysesExperiment extends Element{
  constructor({
    id, devices_analysis_id, holder_id, status, solvent, experiment, checkbox, on_day,
    number_of_scans, numeric, time
  }, sampleId) {
    const device = {
      id: id,
      deviceAnalysisId: devices_analysis_id,
      holderId: holder_id,
      status: status,
      sampleId: sampleId,
      solvent: solvent,
      experiment: experiment,
      checkbox: checkbox,
      onDay: on_day,
      numberOfScans: number_of_scans,
      numeric: numeric,
      time: time,
    }
    super(device)
  }

  static buildEmpty(deviceAnalysisId, sampleId) {
    return new DeviceAnalysis({
      deviceAnalysisId: deviceAnalysisId,
      holderId: null,
      status: "",
      sampleId: sampleId,
      solvent: "",
      experiment: "",
      checkbox: false,
      onDay: true,
      numberOfScans: 0,
      numeric: 0,
      time: "",
    })
  }
}

