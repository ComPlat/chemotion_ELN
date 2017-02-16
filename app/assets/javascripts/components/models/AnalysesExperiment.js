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

  static buildEmpty(deviceAnalysisId) {
    return new AnalysesExperiment({
      devices_analysis_id: deviceAnalysisId,
      holder_id: null,
      status: "",
      solvent: "",
      experiment: "",
      checkbox: false,
      on_day: true,
      number_of_scans: 0,
      numeric: 0,
      time: "",
    })
  }

  serialize() {
    const serialized = super.serialize({ 
      devices_analysis_id: this.deviceAnalysisId,
      holder_id: this.holderId,
      status: this.status,
      solvent: this.solvent,
      experiment: this.experiment,
      checkbox: this.checkbox,
      on_day: this.onDay,
      number_of_scans: parseInt(this.numberOfScans, 10),
      numeric: parseInt(this.numeric, 10),
      time: this.time,
    })
    return serialized
  }
}

