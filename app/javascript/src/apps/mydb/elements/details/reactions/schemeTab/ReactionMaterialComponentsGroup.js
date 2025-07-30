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
        {/* Amount */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.amount_mol || 0}
            unit="mol"
            metricPrefix={metricMol}
            metricPrefixes={metricPrefixesMol}
            precision={4}
            disabled
            size="sm"
          />
        </td>
        {/* Relative MW */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.relative_molecular_weight || 0}
            unit="g/mol"
            precision={2}
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
            precision={4}
            disabled
            size="sm"
          />
        </td>
        {/* Ratio */}
        <td>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={component.equivalent || 0}
            disabled
            size="sm"
          />
        </td>
      </tr>
    );
  }

  render() {
    const { components } = this.props;
    if (!components) {
      return null;
    }
    if (components.length === 0) {
      return <div className="text-center">No components found for this mixture.</div>;
    }
    return (
      <Table responsive className="mixture-components-table">
        <thead>
          <tr>
            <th>Ref</th>
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
    );
  }
}

ReactionMaterialComponentsGroup.propTypes = {
  sampleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onComponentReferenceChange: PropTypes.func,
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
  })).isRequired
};

ReactionMaterialComponentsGroup.defaultProps = {
  onComponentReferenceChange: null,
};

export default ReactionMaterialComponentsGroup;
