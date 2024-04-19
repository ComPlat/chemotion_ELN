import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, ListGroup } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import Material from '../../reactions/schemeTab/Material';
import { permitOn } from 'src/components/common/uis';
import UIStore from 'src/stores/alt/stores/UIStore';

function dummy() { return false; }

function createSample(component) {
  return new Sample(component)
}

const SampleComponentsGroup = ({
    materialGroup, deleteMixtureComponent, onChange, sample,
    headIndex, dropSample,
  }) => {
    const contents = [];
    sample.components = sample.components.map((component) => {
      if (!(component instanceof Sample)) {
        return createSample(component.component_properties)
      }
      return component;
    });
    let sampleComponents = sample.components;
    let index = headIndex;
    if (sampleComponents && sampleComponents.length > 0) {
      sampleComponents.forEach((sampleComponent) => {
        index += 1;
        contents.push((
          <Material
            sample={sample}
            onChange={onChange}
            key={sampleComponent.id}
            material={sampleComponent}
            reaction={sample}
            materialGroup={materialGroup}
            deleteMaterial={sc => deleteMixtureComponent(sc, materialGroup)}
            index={index}
            dropMaterial={dummy}
            dropSample={dropSample}
            lockEquivColumn={false}
            showLoadingColumn={false}
           />
        ));
      });
    }
  
    const headers = {
      group: 'Component',
      amount: 'Amount',
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
            <th style={{ padding: '3px 3px' }}>{headers.amount}</th>
            <th />
            <th />
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
  };
  
  export default SampleComponentsGroup;
