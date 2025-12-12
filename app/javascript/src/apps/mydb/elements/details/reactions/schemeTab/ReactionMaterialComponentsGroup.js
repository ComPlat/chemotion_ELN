import React from 'react';
import PropTypes from 'prop-types';
import { Table, Form } from 'react-bootstrap';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import {
  getMetricMol,
  getMetricMolConc,
  metricPrefixesMol,
  metricPrefixesMolConc
} from 'src/utilities/MetricsUtils';

/**
 * Component to display the components of a mixture sample in a reaction
 */
class ReactionMaterialComponentsGroup extends React.Component {
  handleReferenceChange = (e, component) => {
    const { onComponentReferenceChange } = this.props;
    if (onComponentReferenceChange) {
      onComponentReferenceChange({
        type: 'componentReferenceChanged',
        componentId: component.id,
        checked: e.target.checked,
      });
    }
  };

  handleComponentMetricsChange = (component, metricUnit, metricPrefix) => {
    const { onComponentMetricsChange, sampleId } = this.props;
    if (onComponentMetricsChange) {
      onComponentMetricsChange({
        type: 'ComponentMetricsChanged',
        componentId: component.id,
        sampleId,
        metricUnit,
        metricPrefix,
      });
    }
  };

  renderComponentRow(component) {
    const { sampleId } = this.props;

    // Get metric prefixes using utility functions
    const metricMol = getMetricMol(component);
    const metricMolConc = getMetricMolConc(component);

    return (
      <tr key={component.id}>
        {/* Ref */}
        <td>
          <Form.Check
            id={`ref_${component.id}`}
            type="radio"
            name={`component_reference_${sampleId}`}
            value={component.id}
            checked={!!component.reference}
            onChange={(e) => this.handleReferenceChange(e, component)}
            size="xsm"
            className="m-0"
            aria-label={`Set ${component.id} as reference`}
          />
        </td>
        {/* Component Name */}
        <td>
          <label
            htmlFor={`ref_${component.id}`}
            className="component-name-container"
            style={{ cursor: 'pointer' }}
          >
            <span className="component-name-text">
              {component.molecule_iupac_name
                || component.molecule?.sum_formular
                || component.name}
            </span>
          </label>
        </td>
        {/* Amount */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.amount_mol || 0}
            unit="mol"
            metricPrefix={metricMol}
            metricPrefixes={metricPrefixesMol}
            precision={6}
            disabled
            size="sm"
            onMetricsChange={(e) => this.handleComponentMetricsChange(component, e.metricUnit, e.metricPrefix)}
          />
        </td>
        {/* Relative MW */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.relative_molecular_weight || 0}
            unit="g/mol"
            precision={6}
            disabled
            size="sm"
          />
        </td>
        {/* Total Conc */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.concn || 0}
            unit="mol/l"
            metricPrefix={metricMolConc}
            metricPrefixes={metricPrefixesMolConc}
            precision={6}
            disabled
            size="sm"
            onMetricsChange={(e) => this.handleComponentMetricsChange(component, e.metricUnit, e.metricPrefix)}
          />
        </td>
        {/* Ratio */}
        <td>
          <NumeralInputWithUnitsCompo
            precision={6}
            value={component.equivalent || 0}
            disabled
            size="sm"
          />
        </td>
      </tr>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderSolventRow(solvent) {
    const metricPrefixes = ['m', 'n', 'u'];
    const hasValidMetrics = solvent.metrics && solvent.metrics.length > 2;
    const isValidPrefix = hasValidMetrics && metricPrefixes.includes(solvent.metrics[1]);
    const metric = isValidPrefix ? solvent.metrics[1] : 'm';

    const ratioValue = Number.isFinite(Number(solvent.ratio)) ? Number(solvent.ratio) : 1;
    const purityValue = Number.isFinite(Number(solvent.purity)) ? Number(solvent.purity) : 1.0;

    return (
      <tr key={`${solvent.label}-${solvent.inchikey}`}>
        <td>{solvent.label}</td>
        <td>
          <NumeralInputWithUnitsCompo
            value={solvent.amount_l || 0}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            disabled
            size="sm"
          />
        </td>
        <td>
          <NumeralInputWithUnitsCompo
            value={ratioValue}
            precision={1}
            disabled
            size="sm"
          />
        </td>
        <td>
          <NumeralInputWithUnitsCompo
            value={purityValue}
            precision={3}
            disabled
            size="sm"
          />
        </td>
        <td>{solvent.vendor || ''}</td>
      </tr>
    );
  }

  render() {
    const { components, solvents } = this.props;

    return (
      <>
        {/* Components Table */}
        {components && components.length > 0 && (
          <Table responsive className="mixture-components-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Component</th>
                <th>Amount</th>
                <th>Rel. MW</th>
                <th>Conc</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {components.map((component) => this.renderComponentRow(component))}
            </tbody>
          </Table>
        )}

        {/* Solvents Table */}
        {solvents && solvents.length > 0 && (
          <>
            <div className="mt-3 mb-2 fw-bold">Solvents</div>
            <Table responsive className="mixture-solvents-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Volume</th>
                  <th>Ratio</th>
                  <th>Purity</th>
                </tr>
              </thead>
              <tbody>
                {solvents.map((solvent) => this.renderSolventRow(solvent))}
              </tbody>
            </Table>
          </>
        )}

        {/* No data message */}
        {(!components || components.length === 0) && (!solvents || solvents.length === 0) && (
          <div className="text-center">No components or solvents found for this mixture.</div>
        )}
      </>
    );
  }
}

ReactionMaterialComponentsGroup.propTypes = {
  sampleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onComponentReferenceChange: PropTypes.func,
  onComponentMetricsChange: PropTypes.func,
  components: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    amount_g: PropTypes.number,
    amount_l: PropTypes.number,
    amount_mol: PropTypes.number,
    concn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reference: PropTypes.bool,
    relative_molecular_weight: PropTypes.number,
    metrics: PropTypes.arrayOf(PropTypes.string)
  })),
  solvents: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    amount_l: PropTypes.number,
    scaled_amount_l: PropTypes.number,
    ratio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    metrics: PropTypes.arrayOf(PropTypes.string),
  }))
};

ReactionMaterialComponentsGroup.defaultProps = {
  onComponentReferenceChange: null,
  onComponentMetricsChange: null,
  components: [],
  solvents: [],
};

export default ReactionMaterialComponentsGroup;
