import Element from './Element'

export default class AnalysesExperiment extends Element{
  constructor({
    id, devices_analysis_id, holder_id, status, solvent, experiment, priority, on_day,
    number_of_scans, sweep_width, time
  }, sampleId) {
    const analysis = {
      id: id,
      deviceAnalysisId: devices_analysis_id,
      holderId: holder_id,
      status: status,
      solvent: solvent,
      experiment: experiment,
      priority: priority,
      onDay: on_day,
      numberOfScans: number_of_scans,
      sweepWidth: sweep_width,
      time: time,
    }
    super(analysis)
  }

  static buildEmpty(deviceAnalysisId) {
    return new AnalysesExperiment({
      devices_analysis_id: deviceAnalysisId,
      holder_id: null,
      status: "",
      solvent: "",
      experiment: "",
      priority: false,
      on_day: true,
      number_of_scans: 0,
      sweep_width: 0,
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
      priority: this.priority,
      on_day: this.onDay,
      number_of_scans: parseInt(this.numberOfScans, 10),
      sweep_width: parseInt(this.sweepWidth, 10),
      time: this.time,
    })
    return serialized
  }
}

