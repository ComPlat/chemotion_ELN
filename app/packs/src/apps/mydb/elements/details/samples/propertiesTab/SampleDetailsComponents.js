import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component
import UIStore from 'src/stores/alt/stores/UIStore';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import {
  ListGroup, ListGroupItem
} from 'react-bootstrap';

export default class SampleDetailsComponents extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      sample
    };

    this.dropSample = this.dropSample.bind(this);
    this.dropMaterial = this.dropMaterial.bind(this);
    this.deleteMixtureComponent = this.deleteMixtureComponent.bind(this);
    this.onChangeComponent = this.onChangeComponent.bind(this);
    this.updatedSampleForAmountUnitChange = this.updatedSampleForAmountUnitChange.bind(this);
    this.updatedSampleForMetricsChange = this.updatedSampleForMetricsChange.bind(this);
    this.switchAmount = this.switchAmount.bind(this);
    this.updateComponentName = this.updateComponentName.bind(this);
  }

  onChangeComponent(changeEvent) {
    const { sample } = this.state;

    sample.components = sample.components.map((component) => {
      if (!(component instanceof Component)) {
        return new Component(component)
      }
      return component;
    });

    switch (changeEvent.type) {
      case 'amountChanged':
        this.updatedSampleForAmountUnitChange(changeEvent);
        break;
      case 'MetricsChanged':
        this.updatedSampleForMetricsChange(changeEvent);
        break;
      case 'nameChanged':
        this.updateComponentName(changeEvent);
      break;
      default:
        break;
    }
    this.props.onChange(sample);
  }
  
  
  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const sampleID = changeEvent.sampleID;
    const amount = changeEvent.amount;
    const concType = changeEvent.concType;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );

    const totalVolume = sample.amount_l;

    if (amount.unit === 'g' || amount.unit === 'l') {
      sample.components[componentIndex].setAmount(amount, totalVolume)
    } else if (amount.unit === 'mol/l' ) {
      sample.components[componentIndex].setMolarity(amount, totalVolume, concType)
    }
    // update components ratio
    sample.updateMixtureComponentEquivalent()
  }
  
  updatedSampleForMetricsChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => (component.parent_id === sampleID || component.id === sampleID)
    );
    sample.components[componentIndex].setUnitMetrics(metricUnit, metricPrefix);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    const { currentCollection } = UIStore.getState()
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      splitSample = Sample.buildNew(srcSample, currentCollection.id);
      splitSample = new Component(splitSample)
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChildWithoutCounter();
      splitSample = new Component(splitSample)
    }

    splitSample.material_group = tagGroup;

    if (splitSample.sample_type === 'Mixture') {
      ComponentsFetcher.fetchComponentsBySampleId(srcSample.id)
      .then(async components => {
        for (const component of components) {
          const { component_properties, ...rest } = component;
          const sampleData = {
            ...rest,
            ...component_properties
          };
          let sampleComponent = new Component(sampleData);
          sampleComponent.parent_id = splitSample.parent_id
          sampleComponent.material_group = tagGroup;
          if (tagGroup === 'solid') {
            sampleComponent.setMolarity({ value: 0, unit: 'M' }, sample.amount_l, 'startingConc');
            sampleComponent.setAmount({ value: sampleComponent.amount_g, unit: 'g' }, sample.amount_l);
          } else if (tagGroup === 'liquid') {
            sampleComponent.setAmount({ value: sampleComponent.amount_l, unit: 'l' }, sample.amount_l);
          }
          sampleComponent.id = `comp_${Math.random().toString(36).substr(2, 9)}`
          await sample.addMixtureComponent(sampleComponent);
        }
        this.props.onChange(sample);
      })
        .catch(errorMessage => {
          console.error(errorMessage);
        });
    } else {
      sample.addMixtureComponent(splitSample);
      this.props.onChange(sample);
    }
  }

  updateComponentName(changeEvent) {
    const { sample } = this.props;
    const sampleID = changeEvent.sampleID;
    const newName = changeEvent.newName;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );
    sample.components[componentIndex].name = newName;

    this.props.onChange(sample);
  }

  dropMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    const { sample } = this.state;
    sample.components = sample.components.map((component) => {
      if (!(component instanceof Component)) {
        return new Component(component)
      }
      return component;
    });
    sample.moveMaterial(srcMat, srcGroup, tagMat, tagGroup);
    this.props.onChange(sample);
  }


  deleteMixtureComponent(component) {
    const { sample } = this.state;
    sample.deleteMixtureComponent(component);
    this.props.onChange(sample);
  }

  switchAmount(materialGroup) {
    const { lockAmountColumn, lockAmountColumnSolids } = this.state;
    if (materialGroup === 'liquid') {
      this.setState({ lockAmountColumn: !lockAmountColumn });
    } else if (materialGroup === 'solid') {
      this.setState({ lockAmountColumnSolids: !lockAmountColumnSolids });
    }
  }

  render() {
    const {
      sample, isOver, canDrop
    } = this.props;
    const style = {
      padding: '2px 5px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    const minPadding = { padding: '1px 2px 2px 0px' };

    const liquids = sample.components ? sample.components.filter(component => component.material_group === 'liquid').map(component => component instanceof Component ? component : new Component(component)) : [];
    const solids = sample.components ? sample.components.filter(component => component.material_group === 'solid').map(component => component instanceof Component ? component : new Component(component)) : [];

    return (
      <ListGroup fill="true">
        <ListGroupItem style={minPadding}>
          <SampleDetailsComponentsDnd
          sample={sample}
          sampleComponents={liquids}
          dropSample={this.dropSample}
          dropMaterial={this.dropMaterial}
          deleteMixtureComponent={this.deleteMixtureComponent}
          onChangeComponent={(changeEvent) => this.onChangeComponent(changeEvent)}
          switchAmount={this.switchAmount}
          lockAmountColumn={this.state.lockAmountColumn}
          lockAmountColumnSolids={this.state.lockAmountColumnSolids}
          materialGroup="liquid"
          />
        </ListGroupItem>
        <ListGroupItem style={minPadding}>
          <SampleDetailsComponentsDnd
          sample={sample}
          sampleComponents={solids}
          dropSample={this.dropSample}
          dropMaterial={this.dropMaterial}
          deleteMixtureComponent={this.deleteMixtureComponent}
          onChangeComponent={(changeEvent) => this.onChangeComponent(changeEvent)}
          switchAmount={this.switchAmount}
          lockAmountColumn={this.state.lockAmountColumn}
          lockAmountColumnSolids={this.state.lockAmountColumnSolids}
          materialGroup="solid"
          />
        </ListGroupItem>
      </ListGroup>
      
    );
  }
}

SampleDetailsComponents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

SampleDetailsComponents.defaultProps = {
  canDrop: true,
  isOver: false
};
