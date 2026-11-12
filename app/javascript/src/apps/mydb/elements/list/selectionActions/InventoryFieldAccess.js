import React from 'react';
import PropTypes from 'prop-types';
import { Form, Table } from 'react-bootstrap';

export const FIELD_GROUPS = {
  substance_safety: {
    label: 'Substance and safety', hint: 'Hazard statements, pictograms, safety data sheets; never hidden',
  },
  stock: { label: 'Stock', hint: 'Amount, volume, status, dates, storage temperature' },
  location: { label: 'Location', hint: 'Building, room and cabinet' },
  procurement: { label: 'Procurement', hint: 'Vendor, order and product numbers, price' },
  people: { label: 'People', hint: 'Owner, groups, person, borrowed by' },
  notes: { label: 'Notes', hint: 'Important notes' },
  link: { label: 'External system', hint: 'Source system, external id, last sync' },
};

const LEVELS = ['hidden', 'read', 'edit'];
const LEVEL_LABELS = { hidden: 'Hidden', read: 'Read', edit: 'Edit' };

// The map a share starts with: its own, else the default of its role or permission level.
export function initialFieldAccess(config, permissionLevel, given) {
  if (given) return given;

  return config.role_defaults[config.default_roles[permissionLevel] || 'reviewer'];
}

// Per field group of an inventory collection's samples: hidden, read or edit for this share.
// Levels above the editor's own access are disabled; the server refuses them too.
const InventoryFieldAccess = ({
  groups, access, ownAccess, editAllowed, onChange,
}) => {
  const aboveOwn = (key, level) => ownAccess && LEVELS.indexOf(level) > LEVELS.indexOf(ownAccess[key]);

  return (
    <Form.Group className="mb-3" controlId="inventoryFieldAccess">
      <Form.Label>Inventory field access</Form.Label>
      <Table size="sm" className="mb-1 align-middle">
        <tbody>
          {groups.map(({ key, levels }) => (
            <tr key={key}>
              <td>
                {FIELD_GROUPS[key]?.label || key}
                <div className="text-muted small">{FIELD_GROUPS[key]?.hint}</div>
              </td>
              <td className="w-25">
                <Form.Select
                  size="sm"
                  aria-label={`${FIELD_GROUPS[key]?.label || key} access`}
                  value={access[key] || levels[0]}
                  onChange={(e) => onChange({ ...access, [key]: e.target.value })}
                >
                  {levels.map((level) => (
                    <option key={level} value={level} disabled={aboveOwn(key, level)}>
                      {LEVEL_LABELS[level]}
                    </option>
                  ))}
                </Form.Select>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!editAllowed && (
        <Form.Text className="d-block">
          Edit needs at least the &quot;Edit elements&quot; permission; below it, edit counts as read.
        </Form.Text>
      )}
    </Form.Group>
  );
};

InventoryFieldAccess.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    levels: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  access: PropTypes.objectOf(PropTypes.string).isRequired,
  ownAccess: PropTypes.objectOf(PropTypes.string),
  editAllowed: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

InventoryFieldAccess.defaultProps = {
  ownAccess: null,
  editAllowed: true,
};

export default InventoryFieldAccess;
