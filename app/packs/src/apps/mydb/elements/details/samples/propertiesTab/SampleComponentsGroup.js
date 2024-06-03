import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import { permitOn } from 'src/components/common/uis';
import UIStore from 'src/stores/alt/stores/UIStore';
import SampleComponent from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent.js';

const SampleComponentsGroup = ({
    materialGroup, deleteMixtureComponent, onChange, sample,
    headIndex, dropSample,dropMaterial, lockAmountColumn, lockAmountColumnSolids, switchAmount, sampleComponents,
    showModalWithMaterial
  }) => {
    const contents = [];
    if (sampleComponents && sampleComponents.length > 0) {
      sampleComponents =  sampleComponents.map((component) => {
        if (!(component instanceof Component)) {
          return new Component(component)
        }
        return component;
      });
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
            lockAmountColumnSolids={lockAmountColumnSolids}
            showModalWithMaterial={showModalWithMaterial}
            />
        ));
      });
    }
  
    const headers = {
      name: 'Label',
      amount: 'Amount',
      mass: 'Mass',
      volume: 'Volume',
      startingConc: 'Starting conc.',
      concn: 'Conc.',
      eq: 'Ratio',
      ref: 'Ref'
    };

    if (materialGroup === 'solid') {
      headers.group = 'Solids';
    } else {
      headers.group = 'Liquids';
    }

    const switchAmountTooltip = () => (
      <Tooltip id="assign_button">Lock/unlock amounts <br /> (mass/volume/mol) </Tooltip>
    );
    
    const SwitchAmountButton = (lockAmountColumn, switchAmount, materialGroup) => {
      return (
        <OverlayTrigger placement="top" overlay={switchAmountTooltip()} >
          <Button
            id="lock_amount_column_btn"
            bsSize="xsmall"
            bsStyle={lockAmountColumn ? 'warning' : 'default'}
            onClick={() => switchAmount(materialGroup)}
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
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '3%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '4%' }} />
          </colgroup>
          <thead>
            <tr>
            <th></th>
            <th>{headers.group}</th>
            <th>{headers.name}</th>
            <th>{headers.ref}</th>
            {materialGroup === 'solid' && <th style={{ padding: '3px 3px' }}>{SwitchAmountButton(lockAmountColumnSolids, switchAmount, materialGroup)} {headers.mass}</th>}
            {materialGroup === 'liquid' && <th>{SwitchAmountButton(lockAmountColumn, switchAmount, materialGroup)} {headers.volume}</th>}
            <th>{headers.amount}</th>
            {materialGroup === 'liquid' && <th>{headers.startingConc}</th>}
            {materialGroup === 'solid' && <th></th>}
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
    lockAmountColumn: PropTypes.bool,
    lockAmountColumnSolids: PropTypes.bool,
  };

  SampleComponentsGroup.defaultProps = {
    lockAmountColumn: false,
    lockAmountColumnSolids: false
  };
  
  
  export default SampleComponentsGroup;
