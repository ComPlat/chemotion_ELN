import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Button, Col, Form, Row, Table
} from 'react-bootstrap';
import { Select, CreatableSelect } from 'src/components/common/Select';
import { buildMofid } from 'src/components/mof/mofUtils';

// Inline (SUR)MOF configuration, shown on the Properties tab when the sample
// type is MOF. Persisted on sample_details.mof; see mofUtils.js for the field
// shape and how the MOFid is assembled from Format ID / Topology / Catenation
// plus the fragment SMILES.

const FORMAT_ID_OPTIONS = [{ label: 'MOFid-v1', value: 'MOFid-v1' }];
const FORMAT_KEY_OPTIONS = [{ label: 'MOFkey-v1', value: 'MOFkey-v1' }];
const CATENATION_OPTIONS = ['cat0', 'cat1', 'cat2', 'cat3'].map((v) => ({ label: v, value: v }));

const toOption = (value) => (value ? { label: value, value } : null);

const emptyFragment = () => ({
  type_function: '',
  iupac: '',
  smiles: '',
  inchikey: '',
  ratio: '',
  comment: '',
});

/**
 * (SUR)MOF details editor. Fully controlled: every edit calls onChange with the
 * next mof object (with the MOFid re-derived) so it can be persisted onto
 * sample_details.mof. Uses Chemotion's shared Select / Form components.
 */
const MofDetails = ({ mof, onChange, disabled }) => {
  const data = mof || {};
  const fragments = useMemo(() => (mof?.fragments || []), [mof]);

  // Persist a patch, keeping the derived MOFid in sync with its inputs.
  const update = useCallback((patch) => {
    const next = { ...(mof || {}), ...patch };
    next.mofid = buildMofid(next);
    onChange(next);
  }, [mof, onChange]);

  const updateFragment = useCallback((index, patch) => {
    update({ fragments: fragments.map((frag, idx) => (idx === index ? { ...frag, ...patch } : frag)) });
  }, [fragments, update]);

  const addFragment = useCallback(() => {
    update({ fragments: [...fragments, emptyFragment()] });
  }, [fragments, update]);

  const removeFragment = useCallback((index) => {
    update({ fragments: fragments.filter((_, idx) => idx !== index) });
  }, [fragments, update]);

  const cell = (index, field, placeholder = '') => (
    <Form.Control
      size="sm"
      type="text"
      value={fragments[index][field] || ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => updateFragment(index, { [field]: e.target.value })}
    />
  );

  return (
    <div className="mof-details">
      <h5 className="mb-3">(SUR)MOF configuration</h5>

      <Accordion defaultActiveKey="mof-fragments" className="mof-fragments-section mb-4">
        <Accordion.Item eventKey="mof-fragments">
          <Accordion.Header>(ionic) (SUR)MOF fragments</Accordion.Header>
            <Accordion.Body>
              {!disabled && (
                <div className="d-flex justify-content-end mb-2">
                  <Button size="sm" variant="primary" onClick={addFragment} aria-label="Add fragment">
                    <i className="fa fa-plus" />
                  </Button>
                </div>
              )}
              <Table bordered size="sm" className="mof-fragments-table mb-0">
        <thead>
          <tr>
            <th style={{ width: '13%' }}>Type/Function</th>
            <th style={{ width: '17%' }}>Molecule</th>
            <th style={{ width: '15%' }}>IUPAC</th>
            <th style={{ width: '15%' }}>SMILES</th>
            <th style={{ width: '15%' }}>InChIKey</th>
            <th style={{ width: '8%' }}>Ratio</th>
            <th>Comment</th>
            {!disabled && <th style={{ width: '3rem' }} aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {fragments.length === 0 && (
            <tr>
              <td colSpan={disabled ? 7 : 8} className="text-muted text-center py-3">
                No fragments yet.
                {!disabled && ' Use the + button to add one.'}
              </td>
            </tr>
          )}
          {fragments.map((frag, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              <td>{cell(index, 'type_function')}</td>
              <td>
                {frag.smiles
                  ? <code className="small text-break">{frag.smiles}</code>
                  : <span className="text-muted small">—</span>}
              </td>
              <td>{cell(index, 'iupac')}</td>
              <td>{cell(index, 'smiles')}</td>
              <td>{cell(index, 'inchikey')}</td>
              <td>{cell(index, 'ratio')}</td>
              <td>{cell(index, 'comment')}</td>
              {!disabled && (
                <td className="text-center align-middle">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeFragment(index)}
                    aria-label="Remove fragment"
                  >
                    <i className="fa fa-minus" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
              </Table>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

      <Row className="mb-4 align-items-start">
        <Col md={2}>
          <Form.Group>
            <Form.Label>Format ID</Form.Label>
            <Select
              name="mofFormatId"
              isDisabled={disabled}
              value={toOption(data.format_id)}
              options={FORMAT_ID_OPTIONS}
              onChange={(opt) => update({ format_id: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Format Key</Form.Label>
            <Select
              name="mofFormatKey"
              isDisabled={disabled}
              value={toOption(data.format_key)}
              options={FORMAT_KEY_OPTIONS}
              onChange={(opt) => update({ format_key: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Topology Code(s)</Form.Label>
            <CreatableSelect
              name="mofTopology"
              isClearable
              isDisabled={disabled}
              value={toOption(data.topology)}
              options={data.topology ? [toOption(data.topology)] : []}
              onChange={(opt) => update({ topology: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Catenation</Form.Label>
            <Select
              name="mofCatenation"
              isClearable
              isDisabled={disabled}
              value={toOption(data.cat)}
              options={CATENATION_OPTIONS}
              onChange={(opt) => update({ cat: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Comments</Form.Label>
            <Form.Control
              type="text"
              value={data.format_comments || ''}
              disabled={disabled}
              onChange={(e) => update({ format_comments: e.target.value })}
            />
          </Form.Group>
        </Col>
        <Col md={1}>
          <Form.Group>
            {/* invisible label reserves the label row so the checkbox lines up
                with the sibling input fields, not their labels */}
            <Form.Label className="invisible d-none d-md-block">CCDC No</Form.Label>
            <div className="d-flex align-items-center" style={{ minHeight: '38px' }}>
              <Form.Check
                type="checkbox"
                id="mof-ccdc-no"
                label="CCDC No"
                checked={!!data.ccdc_no}
                disabled={disabled}
                onChange={(e) => update({ ccdc_no: e.target.checked })}
              />
            </div>
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>MOF identifier</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          readOnly
          className="font-monospace"
          value={buildMofid(data)}
          placeholder="Assembled from the fragment SMILES and Format ID / Topology / Catenation"
        />
        <Form.Text muted>
          Generated from the fields above; edit the fragments or format fields to change it.
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-0">
        <Form.Label>MOF key</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          className="font-monospace"
          value={data.mofkey || ''}
          disabled={disabled}
          placeholder="Retrieved from the CIF, or enter manually"
          onChange={(e) => update({ mofkey: e.target.value })}
        />
      </Form.Group>
    </div>
  );
};

MofDetails.propTypes = {
  onChange: PropTypes.func.isRequired,
  mof: PropTypes.shape({
    fragments: PropTypes.arrayOf(PropTypes.object),
    format_id: PropTypes.string,
    format_key: PropTypes.string,
    topology: PropTypes.string,
    cat: PropTypes.string,
    format_comments: PropTypes.string,
    ccdc_no: PropTypes.bool,
    mofid: PropTypes.string,
    mofkey: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};

MofDetails.defaultProps = {
  mof: null,
  disabled: false,
};

export default MofDetails;
