import React, {
  useCallback, useContext, useMemo, useState
} from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Button, Col, Form, OverlayTrigger, Popover, Row, Table
} from 'react-bootstrap';
import { Select, CreatableSelect } from 'src/components/common/Select';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { buildMofid, resolveFragmentIdentifiers } from 'src/components/mof/mofUtils';

// Inline (SUR)MOF configuration, shown on the Properties tab when the sample
// type is MOF. Persisted on sample_details.mof; see mofUtils.js for the field
// shape and how the MOFid is assembled from Format ID / Topology / Catenation
// plus the fragment SMILES.

const FORMAT_ID_OPTIONS = [{ label: 'MOFid-v1', value: 'MOFid-v1' }];
const FORMAT_KEY_OPTIONS = [{ label: 'MOFkey-v1', value: 'MOFkey-v1' }];
const CATENATION_OPTIONS = ['cat0', 'cat1', 'cat2', 'cat3'].map((v) => ({ label: v, value: v }));
const SUBSTRATE_OPTIONS = ['Silicon', 'Glass', 'Aluminium oxide'].map((v) => ({ label: v, value: v }));
const COATING_OPTIONS = ['Gold', 'Platinum'].map((v) => ({ label: v, value: v }));

const toOption = (value) => (value ? { label: value, value } : null);

const emptyFragment = () => ({
  type_function: '',
  iupac: '',
  smiles: '',
  ratio: 1,
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
  const [showComments, setShowComments] = useState(false);
  const { notifications } = useContext(StoreContext) || {};

  // Persist a patch, keeping the derived MOFid in sync with its inputs.
  const update = useCallback((patch) => {
    const next = { ...(mof || {}), ...patch };
    next.mofid = buildMofid(next);
    onChange(next);
  }, [mof, onChange]);

  const updateFragment = useCallback((index, patch) => {
    update({ fragments: fragments.map((frag, idx) => (idx === index ? { ...frag, ...patch } : frag)) });
  }, [fragments, update]);

  // The fragment ratio follows the app's ratio field: it is capped at 1 (and
  // floored at 0), and an out-of-range entry warns before being clamped.
  const updateRatio = useCallback((index, value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 1) {
      notifications?.add?.({
        message: 'Ratio value should be >= 0 and <= 1',
        level: 'error',
      });
    }
    const clamped = Math.min(1, Math.max(0, numeric || 0));
    updateFragment(index, { ratio: clamped });
  }, [updateFragment, notifications]);

  // After a SMILES is edited, resolve it into IUPAC / sum formula / structure SVG
  // so the popover and name stay in sync with the entered structure.
  const resolveRow = useCallback(async (index) => {
    const smiles = `${fragments[index]?.smiles ?? ''}`.trim();
    if (!smiles || disabled) return;
    const patch = await resolveFragmentIdentifiers(smiles);
    if (Object.keys(patch).length) updateFragment(index, patch);
  }, [fragments, disabled, updateFragment]);

  const addFragment = useCallback(() => {
    update({ fragments: [...fragments, emptyFragment()] });
  }, [fragments, update]);

  const removeFragment = useCallback((index) => {
    update({ fragments: fragments.filter((_, idx) => idx !== index) });
  }, [fragments, update]);

  const cell = (index, field, placeholder = '', onBlur = undefined) => (
    <Form.Control
      size="sm"
      type="text"
      value={fragments[index][field] || ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => updateFragment(index, { [field]: e.target.value })}
      onBlur={onBlur}
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
            <th style={{ width: '16%' }}>Type/Function</th>
            <th style={{ width: '40%' }}>Molecule</th>
            <th style={{ width: '26%' }}>IUPAC</th>
            <th style={{ width: '10%' }}>Ratio</th>
            {showComments && <th>Comment</th>}
            {!disabled && <th style={{ width: '1%', whiteSpace: 'nowrap' }} aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {fragments.length === 0 && (
            <tr>
              <td colSpan={4 + (showComments ? 1 : 0) + (disabled ? 0 : 1)} className="text-muted text-center py-3">
                No fragments yet.
                {!disabled && ' Use the + button to add one.'}
              </td>
            </tr>
          )}
          {fragments.map((frag, index) => {
            const svgSrc = frag.svg_file ? `/images/molecules/${frag.svg_file}` : null;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td>{cell(index, 'type_function')}</td>
                <td className="align-middle text-start">
                  {svgSrc ? (
                    <OverlayTrigger
                      trigger={['hover']}
                      placement="right"
                      overlay={(
                        <Popover id={`mof-fragment-${index}`}>
                          <Popover.Header as="h3" className="text-break font-monospace">
                            {frag.smiles}
                          </Popover.Header>
                          <Popover.Body>
                            <img
                              src={svgSrc}
                              alt={frag.smiles}
                              style={{ maxWidth: '32vw', maxHeight: '26vh' }}
                            />
                          </Popover.Body>
                        </Popover>
                      )}
                    >
                      {cell(index, 'smiles', 'SMILES', () => resolveRow(index))}
                    </OverlayTrigger>
                  ) : (
                    cell(index, 'smiles', 'SMILES', () => resolveRow(index))
                  )}
                </td>
                <td>{cell(index, 'iupac')}</td>
              <td>
                <NumeralInputWithUnitsCompo
                  precision={4}
                  value={frag.ratio == null || frag.ratio === '' ? 1 : (Number(frag.ratio) || 0)}
                  disabled={disabled}
                  onChange={(e) => updateRatio(index, e.value)}
                />
              </td>
              {showComments && <td>{cell(index, 'comment')}</td>}
              {!disabled && (
                <td className="text-center align-middle" style={{ width: '1%', whiteSpace: 'nowrap' }}>
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
            );
          })}
        </tbody>
              </Table>
              <div className="d-flex justify-content-center align-items-center mt-3">
                <Form.Check
                  className="mof-show-comments"
                  style={{ margin: 0 }}
                  type="checkbox"
                  id="mof-show-comments"
                  checked={showComments}
                  onChange={(e) => setShowComments(e.target.checked)}
                  label={(
                    <label htmlFor="mof-show-comments" style={{ cursor: 'pointer', marginBottom: 0 }}>
                      Show comments
                    </label>
                  )}
                />
              </div>
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
        <Col md={3}>
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
        <Col md={3}>
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
        <Col md={2}>
          <Form.Group>
            <Form.Label>CCDC No</Form.Label>
            <Form.Control
              type="text"
              value={data.ccdc_no || ''}
              disabled={disabled}
              onChange={(e) => update({ ccdc_no: e.target.value })}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>substrate</Form.Label>
            <Select
              name="mofSubstrate"
              isClearable
              isDisabled={disabled}
              value={toOption(data.substrate)}
              options={SUBSTRATE_OPTIONS}
              onChange={(opt) => update({ substrate: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>coating</Form.Label>
            <Select
              name="mofCoating"
              isClearable
              isDisabled={disabled}
              value={toOption(data.coating)}
              options={COATING_OPTIONS}
              onChange={(opt) => update({ coating: opt?.value || '' })}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>dimensions</Form.Label>
            <Form.Control
              type="text"
              value={data.dimensions || ''}
              disabled={disabled}
              onChange={(e) => update({ dimensions: e.target.value })}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>MOF identifier</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          readOnly
          value={buildMofid(data)}
          placeholder="Assembled from the fragment SMILES and Format ID / Topology / Catenation"
        />
      </Form.Group>

      <Form.Group className="mb-0">
        <Form.Label>MOF key</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
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
    ccdc_no: PropTypes.string,
    substrate: PropTypes.string,
    coating: PropTypes.string,
    dimensions: PropTypes.string,
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
