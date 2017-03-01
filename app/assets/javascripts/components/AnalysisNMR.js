import React from 'react'
import{
  Col, Form, FormGroup, ControlLabel, FormControl, ButtonToolbar,
  Button, Radio, Checkbox, PanelGroup, Panel
} from 'react-bootstrap'
import Select from 'react-select'
import ElementActions from './actions/ElementActions'

import {solvents, experiments} from './staticDropdownOptions/device_options'

const AnalysisNMR = ({analysis, closeDetails}) => {
  const styleByExperimentState = (experiment) => {
    return experiment.isNew || experiment.isEdited
      ? "info" 
      : "default"
  }
  return (
    <div
      style={{marginBottom: 10}}
    >
      <Form horizontal>
        <FormGroup>
          <Col sm={1}>
            <ControlLabel>Holder</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Status</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Name</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Solvent</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Experiment</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Priority</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Daytime</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Number of Scans</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Sweep Width</ControlLabel>
          </Col>
          <Col sm={1}>
            <ControlLabel>Time</ControlLabel>
          </Col>
          <Col sm={2}>
          </Col>
        </FormGroup>
        {analysis.experiments.length > 0
          ? analysis.experiments.map((experiment, key) => {
              return (
                  <Experiment
                    key={key}
                    experiment={experiment}
                    analysis={analysis}
                  />
              )
            })
          : (
            <FormGroup style={{marginLeft: 0}}>
              This analysis has no experiments yet.
            </FormGroup>
          )
        }
      </Form>
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => closeDetails(analysis)}>
          Close
        </Button>
        <Button
          bsStyle="warning"
          disabled={!analysis.isEdited}
          onClick={() => {
            ElementActions.saveDeviceAnalysis(analysis)
            if (analysis.isNew) {
              closeDetails(analysis, true)
            }
          }}
        >
          Save
        </Button>
      </ButtonToolbar>
    </div>
  )
}

export default AnalysisNMR

const Experiment = ({analysis, experiment}) => {
  const handlePropChange = (prop, value) => {
    ElementActions.changeAnalysisExperimentProp(analysis, experiment, prop, value)
  }
  const handleSelectChange = (prop, e) => {
    if(e && e.value) {
      handlePropChange(prop, e.value)
    } else {
      handlePropChange(prop, "")
    }
  }

  return (
    <FormGroup>
      <Col sm={1}>
        <FormControl.Static>
          {experiment.holderId ? experiment.holderId : "-"}
        </FormControl.Static>
      </Col>
      <Col sm={1}>
        <FormControl.Static>
          {experiment.status ? experiment.status : "-"}
        </FormControl.Static>
      </Col>
      <Col sm={1}>
        <FormControl.Static>
          {experiment.sampleShortLabel}
        </FormControl.Static>
      </Col>
      <Col sm={1}>
        <Select
          id="solvent"
          name='solvent'
          multi={false}
          options={solvents}
          onChange={(e) => handleSelectChange('solvent', e)}
          value={experiment.solvent}
        />
      </Col>
      <Col sm={1}>
        <Select
          id="experiment"
          name='experiment'
          multi={false}
          options={experiments}
          onChange={(e) => {
            handlePropChange('time', e.time)
            handleSelectChange('experiment', e)
          }}
          value={experiment.experiment}
        />
      </Col>
      <Col sm={1}>
        <Checkbox
          checked={experiment.priority}
          onChange={(e) => handlePropChange('priority', !experiment.priority)}
        >
        </Checkbox>
      </Col>
      <Col sm={1}>
        <Radio
          checked={experiment.onDay}
          onChange={(e) => handlePropChange('onDay', true)}
          style={{minHeight: 20, marginBottom: -3, paddingTop: 0}}
        >
          Day
        </Radio>
        <Radio
          checked={!experiment.onDay}
          onChange={(e) => handlePropChange('onDay', false)}
          style={{minHeight: 20, marginBottom: -3, paddingTop: 0}}
        >
          Night
        </Radio>
      </Col>
      <Col sm={1}>
        <FormControl
          value={experiment.numberOfScans}
          onChange={(e) => handlePropChange('numberOfScans', e.target.value)}
        />
      </Col>
      <Col sm={1}>
        <FormControl
          value={experiment.sweepWidth}
          onChange={(e) => handlePropChange('sweepWidth', e.target.value)}
        />
      </Col>
      <Col sm={1}>
        <FormControl.Static>
          {experiment.time && experiment.time !== "" ? experiment.time : "-"}
        </FormControl.Static>
      </Col>
      <Col sm={2}>
        <ButtonToolbar>
          <Button 
            bsSize="xsmall"
            bsStyle="danger"
            onClick={(e) => ElementActions.deleteAnalysisExperiment(analysis, experiment)}
          >
            <i className="fa fa-trash"></i>
          </Button>
          <Button 
            bsSize="xsmall"
            bsStyle="info"
            onClick={(e) => ElementActions.duplicateAnalysisExperiment(analysis, experiment)}
          >
            Add
          </Button>
          <Button 
            bsSize="xsmall"
            bsStyle="success"
            onClick={(e) => ElementActions.generateExperimentConfig(experiment)}
          >
            Submit
          </Button>
        </ButtonToolbar>
      </Col>
    </FormGroup>
  )
}

