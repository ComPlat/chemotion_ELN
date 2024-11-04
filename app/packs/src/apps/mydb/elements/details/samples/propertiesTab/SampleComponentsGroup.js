import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, OverlayTrigger, Tooltip, Tab, Tabs, ControlLabel
} from 'react-bootstrap';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import SampleComponent from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

class SampleComponentsGroup extends React.Component {
  constructor(props) {
    super(props);

    const componentState = ComponentStore.getState();
    this.state = {
      lockAmountColumn: componentState.lockAmountColumn,
      lockAmountColumnSolids: componentState.lockAmountColumnSolids,
    };
    this.onComponentStoreChange = this.onComponentStoreChange.bind(this);
  }

  componentDidMount() {
    ComponentStore.listen(this.onComponentStoreChange);
  }

  componentWillUnmount() {
    ComponentStore.unlisten(this.onComponentStoreChange);
  }

  onComponentStoreChange(state) {
    this.setState({ ...state });
  }

  renderSwitchAmountButton(lockState, materialGroup, actionType) {
    const updatedActionType = materialGroup === 'solid' ? `${actionType}Solids` : actionType;

    const handleClick = () => {
      ComponentActions.toggleLockState(!lockState, updatedActionType);
    };

    return (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id={`switch-amount-${actionType}`}>
            <span style={{ display: 'block' }}>Lock/unlock</span>
          </Tooltip>
        )}
      >
        <Button
          style={{ marginRight: '5px' }}
          bsSize="xsmall"
          bsStyle={lockState ? 'warning' : 'default'}
          onClick={handleClick}
        >
          <i className={lockState ? 'fa fa-lock' : 'fa fa-unlock'} />
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    const {
      materialGroup, deleteMixtureComponent, onChange, sample, headIndex, dropSample, dropMaterial, sampleComponents,
      showModalWithMaterial, activeTab, handleTabSelect, enableComponentLabel, enableComponentPurity
    } = this.props;
    const { lockAmountColumn, lockAmountColumnSolids } = this.state;

    const contents = sampleComponents && sampleComponents.length > 0 ? sampleComponents.map((component, idx) => {
      const newComponent = component instanceof Component ? component : new Component(component);
      const index = headIndex + idx + 1;
      return (
        <SampleComponent
          key={newComponent.id}
          sample={sample}
          onChange={onChange}
          material={newComponent}
          materialGroup={materialGroup}
          deleteMaterial={() => deleteMixtureComponent(newComponent, materialGroup)}
          index={index}
          dropMaterial={dropMaterial}
          dropSample={dropSample}
          showModalWithMaterial={showModalWithMaterial}
          activeTab={activeTab}
          handleTabSelect={handleTabSelect}
          enableComponentLabel={enableComponentLabel}
          enableComponentPurity={enableComponentPurity}
        />
      );
    }) : [];

    const headers = {
      name: 'Label',
      amount: 'Amount',
      mass: 'Mass',
      volume: 'Volume',
      startingConc: 'Stock',
      concn: 'Total Conc.',
      eq: 'Ratio',
      ref: 'Ref',
      purity: 'Purity',
      density: 'Density',
      group: materialGroup === 'solid' ? 'Solids' : 'Liquids',
    };

    return (
      <div>
        <table width="100%" className="sample-scheme">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '2%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '2%' }} />
            <col style={{ width: '14%' }} />
            {enableComponentLabel && <col style={{ width: '4%' }} />}
            {enableComponentPurity && <col style={{ width: '4%' }} />}
          </colgroup>
          <thead>
          <tr>
            <th />
            <th>{headers.group}</th>
            <th />
            {materialGroup === 'solid' && <th />}
            {materialGroup === 'solid' && (
              <th style={{ padding: '3px 3px' }}>
                {this.renderSwitchAmountButton(lockAmountColumnSolids, materialGroup, 'amount')}
                {' '}
                {headers.mass}
              </th>
            )}
            {materialGroup === 'liquid' && (
              <th>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {this.renderSwitchAmountButton(lockAmountColumn, materialGroup, 'amount')}
                  <Tabs
                    onSelect={handleTabSelect}
                    id="material-tabs"
                  >
                    <Tab eventKey="concentration" title="Stock" />
                    <Tab eventKey="density" title="Density" />
                  </Tabs>
                </div>
              </th>
            )}

            {materialGroup === 'liquid' && (
              <th>
                {headers.volume}
              </th>
            )}
            <th>{headers.amount}</th>

            <th>{headers.eq}</th>
            <th>{headers.ref}</th>
            {materialGroup === 'solid' && (
              <th>
                {headers.concn}
                <OverlayTrigger
                  placement="top"
                  overlay={(
                    <Tooltip id="info-total-conc">
                      Total Conc. will only be calculated when we have a Total volume
                    </Tooltip>
                  )}
                >
                  <ControlLabel style={{ marginLeft: '5px' }}>
                    <span style={{ cursor: 'pointer' }} className="glyphicon glyphicon-info-sign" />
                  </ControlLabel>
                </OverlayTrigger>
              </th>
            )}
            {
              materialGroup === 'liquid' && (
                <th>
                  {headers.concn}
                  <OverlayTrigger
                    placement="top"
                    overlay={(
                      <Tooltip id="info-total-conc">
                        Total Conc. will only be calculated when we have a Total volume
                      </Tooltip>
                    )}
                  >
                    <ControlLabel style={{marginLeft: '5px'}}>
                      <span style={{cursor: 'pointer'}} className="glyphicon glyphicon-info-sign"/>
                    </ControlLabel>
                  </OverlayTrigger>
                </th>
              )
            }
            {enableComponentLabel && <th>{headers.name}</th>}
            {enableComponentPurity && <th>{headers.purity}</th>}
          </tr>
          </thead>
          <tbody>
          {contents.map((item) => item)}
          </tbody>
        </table>
      </div>
    );
  }
}

SampleComponentsGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number.isRequired,
  deleteMixtureComponent: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  sample: PropTypes.instanceOf(Sample).isRequired,
  dropSample: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};

export default SampleComponentsGroup;
