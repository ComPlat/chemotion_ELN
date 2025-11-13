import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  OverlayTrigger,
  Tooltip,
  Form,
  ButtonGroup,
} from 'react-bootstrap';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import SampleComponent from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

class SampleComponentsGroup extends React.Component {
  constructor(props) {
    super(props);

    const componentState = ComponentStore.getState();
    const { sample } = this.props;
    this.state = {
      lockAmountColumn: ComponentStore.getLockStateForSample(componentState, 'lockAmountColumn', sample?.id),
      lockAmountColumnSolids: ComponentStore.getLockStateForSample(
        componentState,
        'lockAmountColumnSolids',
        sample?.id
      ),
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
    const { sample } = this.props;
    this.setState({
      lockAmountColumn: ComponentStore.getLockStateForSample(state, 'lockAmountColumn', sample?.id),
      lockAmountColumnSolids: ComponentStore.getLockStateForSample(state, 'lockAmountColumnSolids', sample?.id),
    });
  }

  /**
   * Renders the toggle buttons for switching between stock molarity and density input.
   * @param {Object} headers - The table headers object
   * @returns {JSX.Element} The button group for stock/density
   */
  stockMolarityInput(headers) {
    const { handleTabSelect, activeTab } = this.props;

    return (
      <ButtonGroup>
        <ButtonGroupToggleButton
          onClick={() => handleTabSelect('concentration')}
          active={activeTab === 'concentration'}
          size="xxsm"
        >
          {headers.startingConc}
        </ButtonGroupToggleButton>
        <ButtonGroupToggleButton
          onClick={() => handleTabSelect('density')}
          active={activeTab === 'density'}
          size="xxsm"
        >
          {headers.density}
        </ButtonGroupToggleButton>
      </ButtonGroup>
    );
  }

  /**
   * Renders the lock/unlock button for amount columns.
   * @param {boolean} lockState - Whether the column is locked
   * @param {string} materialGroup - The group type ('liquid' or 'solid')
   * @param {string} actionType - The action type string
   * @returns {JSX.Element} The lock button
   */
  renderSwitchAmountButton(lockState, materialGroup, actionType) {
    const updatedActionType = materialGroup === 'solid' ? `${actionType}Solids` : actionType;
    const { sample } = this.props;

    const handleClick = () => {
      ComponentActions.toggleLockState(!lockState, updatedActionType, sample?.id);
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
          onClick={handleClick}
          size="xxsm"
          variant={lockState ? 'warning' : 'light'}
          className="ms-1"
          style={{ marginRight: '2px' }}
        >
          <i className={lockState ? 'fa fa-lock' : 'fa fa-unlock'} />
        </Button>
      </OverlayTrigger>
    );
  }

  /**
   * Renders the table of sample components with headers and rows.
   * @returns {JSX.Element} The rendered table
   */
  render() {
    const {
      materialGroup, deleteMixtureComponent, onChange, sample, headIndex, dropSample, dropMaterial, sampleComponents,
      showModalWithMaterial, activeTab, handleTabSelect, enableComponentPurity
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
          enableComponentPurity={enableComponentPurity}
        />
      );
    }) : [];

    const headers = {
      amount: 'Amount',
      mass: 'Mass',
      volume: 'Volume',
      startingConc: 'Stock',
      concn: 'Total conc.',
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
            {enableComponentPurity && <col style={{ width: '4%' }} />}
          </colgroup>
          <thead>
          <tr>
            <th/>
            <th>{headers.group}</th>
            <th/>
            {materialGroup === 'solid' && <th/>}
            {materialGroup === 'solid' && (
              <th style={{padding: '3px 3px'}}>
                {this.renderSwitchAmountButton(lockAmountColumnSolids, materialGroup, 'amount')}
                {' '}
                {headers.mass}
              </th>
            )}
            {materialGroup === 'liquid' && (
              <th>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  {this.renderSwitchAmountButton(lockAmountColumn, materialGroup, 'amount')}
                  {this.stockMolarityInput(headers)}
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
                <i className="ms-1 fa fa-info-circle"/>
              </OverlayTrigger>
            </th>
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
  enableComponentPurity: PropTypes.bool.isRequired,
};

export default SampleComponentsGroup;
