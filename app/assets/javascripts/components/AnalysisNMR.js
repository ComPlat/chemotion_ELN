import React from 'react'
import {Table, FormGroup, FormControl, Button, Radio, Checkbox} from 'react-bootstrap'
import Select from 'react-select'
import ElementActions from './actions/ElementActions'

import {solvents, experiments} from './staticDropdownOptions/device_options'

const AnalysisNMR = ({analysis}) => {
  return (
    <div
      style={{marginBottom: 10}}
    >
      <Button
        bsSize="xsmall"
        bsStyle='success'
        style={{float: "right"}}
        onClick={() => ElementActions.createAnalysisExperiment(analysis)}
      >
        Add Experiment
      </Button>
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>Holder</th>
            <th>Status</th>
            <th>Name</th>
            <th>Solvent</th>
            <th>Experiment</th>
            <th>Checkbox</th>
            <th>Day/Night</th>
            <th>Number of Scans</th>
            <th>Numeric</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
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
            : <tr><td colSpan="11">This analysis has no experiments yet.</td></tr>
          }
        </tbody>
      </Table>
    </div>
  )
}

export default AnalysisNMR

const Experiment = ({analysis, experiment}) => {
  const handlePropChange = (prop, value) => {
    console.log(prop, value)
    ElementActions.changeAnalysisExperimentProp(analysis, experiment, prop, value)
  }

  return (
    <tr>
      <td>
        <Button 
          bsStyle="danger"
          onClick={() => ElementActions.deleteAnalysisExperiment(analysis, experiment)}
        >
          <i className="fa fa-trash"></i>
        </Button>
      </td>
      <td>
        <FormControl.Static>
          {experiment.holderId ? experiment.holderId : "-"}
        </FormControl.Static>
      </td>
      <td>
        <FormControl.Static>
          {experiment.status ? experiment.status : "-"}
        </FormControl.Static>
      </td>
      <td>
        <FormControl.Static>
          {analysis.sampleId}
        </FormControl.Static>
      </td>
      <td>
        <Select
          id="solvent"
          name='solvent'
          multi={false}
          options={solvents}
          onChange={(e) => handlePropChange('solvent', e.value)}
          value={experiment.solvent}
        />
      </td>
      <td>
        <Select
          id="solvent"
          name='experiment'
          multi={false}
          options={experiments}
          onChange={(e) => handlePropChange('experiment', e.value)}
          value={experiment.experiment}
        />
      </td>
      <td>
        <Checkbox
          checked={experiment.checkbox}
          onChange={(e) => handlePropChange('checkbox', !experiment.checkbox)}
        >
        </Checkbox>
      </td>
      <td>
        <Radio
          checked={experiment.onDay}
          style={{marginTop: 0, marginBottom: 0}}
          onChange={(e) => handlePropChange('onDay', true)}
        >
          Day
        </Radio>
        <Radio
          checked={!experiment.onDay}
          style={{marginTop: 0, marginBottom: 0}}
          onChange={(e) => handlePropChange('onDay', false)}
        >
          Night
        </Radio>
      </td>
      <td>
        <FormControl
          value={experiment.numberOfScans}
          onChange={(e) => handlePropChange('numberOfScans', e.target.value)}
        />
      </td>
      <td>
        <FormControl
          value={experiment.numeric}
          onChange={(e) => handlePropChange('numeric', e.target.value)}
        />
      </td>
      <td>
        <FormControl
          value={experiment.time}
          onChange={(e) => handlePropChange('time', e.target.value)}
        />
      </td>
    </tr>
  
  )
}
