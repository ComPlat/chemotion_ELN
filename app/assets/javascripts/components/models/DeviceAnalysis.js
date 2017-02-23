import Element from './Element'
import AnalysesExperiment from './AnalysesExperiment'
import _ from 'lodash'

export default class DeviceAnalysis extends Element{
  constructor({
     id, sample_id, device_id, analysis_type, title, experiments, analysis_barcode
  }) {
    const device = {
      id: id,
      sampleId: sample_id,
      analysisBarcode: analysis_barcode,
      deviceId: device_id,
      experiments: experiments.map((e) => new AnalysesExperiment(e, sample_id)),
      type: 'deviceAnalysis',
      analysisType: analysis_type,
      title,
      activeAccordionExperiment: 0,
    }
    super(device)
  }

  static buildEmpty(deviceId, sampleId, analysisType) {
    return new DeviceAnalysis({
      sample_id: sampleId,
      analysisBarcode: null,
      device_id: deviceId,
      experiments: [],
      type: 'deviceAnalysis',
      analysis_type: analysisType,
      title: `${deviceId}-${sampleId}`,
      activeAccordionExperiment: 0
    })
  }
  
  checksum() {
    return super.checksum(['activeAccordionExperiment'])
  }
 
  serialize() {
    const serialized = super.serialize({
      sample_id: this.sampleId,
      device_id: this.deviceId,
      analysis_barcode: this.analysisBarcode,
      experiments: this.experiments.map((e) => e.serialize()),
      analysis_type: this.analysisType,
      title: this.title,
    })
    return serialized 
  }

  buildConfig() {
    return {
      sample_id: this.sampleId,
      data: this.buildExperimentsConfig()
    }
  }

  buildExperimentsConfig() {
    return this.experiments.map((e) => {
      const configMap = {
        'SOLVENT': e.solvent,
        'EXPERIMENT': e.experiment,
        'NAME': `Sample ${this.sampleId}`,
        'BARCODE': this.analysisBarcode,
        'PARAMETERS': `ns, ${e.numberOfScans}, sw, ${e.sweepWidth}`
      }
      const conditionedNight = !e.onDay ? {'NIGHT': null} : {}
      const conditionedPriority = e.checkbox ? {'PRIORITY': null} : {}
      return {
        ...configMap,
        ...conditionedNight,
        ...conditionedPriority
      }
    })
  }
}
