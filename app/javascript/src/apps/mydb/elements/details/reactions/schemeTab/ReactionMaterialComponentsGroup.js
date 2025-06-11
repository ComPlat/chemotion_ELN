import React from 'react';
import PropTypes from 'prop-types';
import { Table, Form } from 'react-bootstrap';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

/**
 * Component to display the components of a mixture sample in a reaction
 */
class ReactionMaterialComponentsGroup extends React.Component {
  renderComponentRow(component) {
    // Prefer g > l > mol for the amount
    let amount = '';
    let unit = '';
    if (component.amount_g) {
      amount = component.amount_g;
      unit = 'g';
    } else if (component.amount_l) {
      amount = component.amount_l;
      unit = 'l';
    } else if (component.amount_mol) {
      amount = component.amount_mol;
      unit = 'mol';
    }
    return (
      <tr key={component.id}>
        {/* Ref */}
        <td>
          <Form.Check
            type="radio"
            name="reference"
            checked={!!component.reference}
            size="xsm"
            className="m-0"
          />
        </td>
        {/* Amount */}
        <td>
          <NumeralInputWithUnitsCompo
            value={amount}
            unit={unit}
            precision={4}
            disabled
            size="sm"
          />
        </td>
        {/* Total Conc */}
        <td>
          <NumeralInputWithUnitsCompo
            value={component.concn || ''}
            unit="mol/l"
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
            <th>Conc</th>
            <th>Equiv</th>
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
  components: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    amount_g: PropTypes.number,
    amount_l: PropTypes.number,
    amount_mol: PropTypes.number,
    concn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reference: PropTypes.bool
  })).isRequired
};

export default ReactionMaterialComponentsGroup;
