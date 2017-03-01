import Element from './Element'
import uuid from 'uuid';

export default class AnalysesExperiment extends Element{
  constructor({
    id, devices_analysis_id, holder_id, status, solvent, experiment, priority, on_day,
    number_of_scans, sweep_width, time, analysis_barcode, sample_short_label, sample_id, devices_sample_id
  }) {
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
      analysisBarcode: analysis_barcode,
      sampleShortLabel: sample_short_label,
      sampleId: sample_id,
      deviceSampleId: devices_sample_id
    }
    super(analysis)
  }

  static buildEmpty(sampleId, sampleShortLabel, deviceSampleId) {
    return new AnalysesExperiment({
      id: uuid.v1(),
      devices_sample_id: deviceSampleId,
      devices_analysis_id: null,
      holder_id: null,
      status: "",
      solvent: "",
      experiment: "",
      priority: false,
      on_day: true,
      number_of_scans: 0,
      sweep_width: 0,
      time: "",
      analysis_barcode: "",
      sample_short_label: sampleShortLabel,
      sample_id: sampleId,
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
      sample_id: this.sampleId,
      devices_sample_id: this.deviceSampleId,
    })
    return serialized
  }

  buildConfig() {
      const configMap = {
        'SOLVENT': this.solvent,
        'EXPERIMENT': this.experiment,
        'NAME': this.sampleShortLabel,
        'BARCODE': this.analysisBarcode,
        'PARAMETERS': `ns, ${this.numberOfScans}, sw, ${this.sweepWidth}`
      }
      const conditionedNight = !this.onDay ? {'NIGHT': null} : {}
      const conditionedPriority = this.priority ? {'PRIORITY': null} : {}
      return {
        sample_id: this.sampleId,
        data: [{
        ...configMap,
        ...conditionedNight,
        ...conditionedPriority
        }]
      }
  }
}

