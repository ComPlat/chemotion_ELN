import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import Material from '../../reactions/schemeTab/Material';
import { permitOn } from 'src/components/common/uis';
import UIStore from 'src/stores/alt/stores/UIStore';
import SampleComponent from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent.js';

const SampleComponentsGroup = ({
    materialGroup, deleteMixtureComponent, onChange, sample,
    headIndex, dropSample,dropMaterial, lockAmountColumn, switchAmount
  }) => {
    const contents = [];
    let sampleComponents = sample.components;
    if (sampleComponents && sampleComponents.length > 0) {
      let index = headIndex;
      sampleComponents.forEach((sampleComponent) => {
        index += 1;
        contents.push((
          <SampleComponent
            sample={sample}
            onChange={onChange}
            key={sampleComponent.id}
            material={sampleComponent}
            materialGroup={materialGroup}
            deleteMaterial={sc => deleteMixtureComponent(sc, materialGroup)}
            index={index}
            dropMaterial={dropMaterial}
            dropSample={dropSample}
            lockAmountColumn={lockAmountColumn}
           />
        ));
      });
    }
  
    const headers = {
      group: 'Component',
      amount: 'Amount',
      mass: 'Mass',
      volume: 'Volume',
      stockConc: 'Stock conc.',
      concn: 'Target conc',
      eq: 'Ratio'
    };
  
    const { currentCollection } = UIStore.getState()

    const addSampleButton = (
      <Button
        disabled={!permitOn(sample)}
        bsStyle="success"
        bsSize="xs"
        onClick={() => ElementActions.addSampleToMaterialGroup({ sample, materialGroup, currentCollection })}
      >
        <Glyphicon glyph="plus" />
      </Button>
    );

    const switchAmountTooltip = () => (
      <Tooltip id="assign_button">Lock/unlock amounts <br /> (mass/volume/mol) </Tooltip>
    );
    
    const SwitchAmountButton = (lockAmountColumn, switchAmount) => {
      return (
        <OverlayTrigger placement="top" overlay={switchAmountTooltip()} >
          <Button
            id="lock_amount_column_btn"
            bsSize="xsmall"
            bsStyle={lockAmountColumn ? 'warning' : 'default'}
            onClick={switchAmount}
          >
            <i className={lockAmountColumn ? 'fa fa-lock' : 'fa fa-unlock'} />
          </Button>
        </OverlayTrigger>
      );
    };
  
    return (
      <div>
        <table width="100%" className="sample-scheme">
          <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '4%' }} />
          </colgroup>
          <thead>
            <tr>
            <th>{addSampleButton}</th>
            <th>{headers.group}</th>
            <th style={{ padding: '3px 3px' }}>{SwitchAmountButton(lockAmountColumn, switchAmount)} {headers.mass}</th>
            <th>{headers.volume}</th>
            <th>{headers.amount}</th>
            <th>{headers.stockConc}</th>
            <th>{headers.concn}</th>
            <th>{headers.eq}</th>
            </tr>
          </thead>
          <tbody>
            {contents.map(item => item)}
          </tbody>
        </table>
      </div>
    );
  };
  
  SampleComponentsGroup.propTypes = {
    materialGroup: PropTypes.string.isRequired,
    headIndex: PropTypes.number.isRequired,
    deleteMixtureComponent: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    sample: PropTypes.instanceOf(Sample).isRequired,
    dropSample: PropTypes.func.isRequired,
    dropMaterial: PropTypes.func.isRequired,
    switchAmount: PropTypes.func.isRequired,
    lockAmountColumn: PropTypes.bool
  };
  
  export default SampleComponentsGroup;
