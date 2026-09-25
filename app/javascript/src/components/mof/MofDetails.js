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

const emptyDefect = () => ({
  defect_type: '',
  description: '',
});

/**
 * (SUR)MOF details editor. Fully controlled: every edit calls onChange with the
 * next mof object (with the MOFid re-derived) so it can be persisted onto
 * sample_details.mof. Uses Chemotion's shared Select / Form components.
 */
const MofDetails = ({ mof, onChange, disabled }) => {
  const data = mof || {};
  const fragments = useMemo(() => (mof?.fragments || []), [mof]);
  const defects = useMemo(() => (mof?.defects || []), [mof]);
  // Optional fragment columns, revealed on demand via the toolbar toggle buttons.
  const [extraCols, setExtraCols] = useState({ smiles: false, inchikey: false, comment: false });
  const toggleCol = useCallback((key) => setExtraCols((cols) => ({ ...cols, [key]: !cols[key] })), []);
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

  // The fragment ratio holds the derived stoichiometric coefficient (e.g. a node
  // to linker ratio of 1:6), so it is a non-negative number and not capped at 1.
  // A negative or non-numeric entry warns and is floored at 0.
  const updateRatio = useCallback((index, value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0) {
      notifications?.add?.({
        message: 'Ratio value should be a non-negative number',
        level: 'error',
      });
    }
    const safe = Number.isNaN(numeric) ? 0 : Math.max(0, numeric);
    updateFragment(index, { ratio: safe });
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

  const updateDefect = useCallback((index, patch) => {
    update({ defects: defects.map((defect, idx) => (idx === index ? { ...defect, ...patch } : defect)) });
  }, [defects, update]);

  const addDefect = useCallback(() => {
    update({ defects: [...defects, emptyDefect()] });
  }, [defects, update]);

  const removeDefect = useCallback((index) => {
    update({ defects: defects.filter((_, idx) => idx !== index) });
  }, [defects, update]);

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

  const defectCell = (index, field, placeholder = '') => (
    <Form.Control
      size="sm"
      type="text"
      value={defects[index][field] || ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => updateDefect(index, { [field]: e.target.value })}
    />
  );

  return (
    <div className="mof-details">
      <h5 className="mb-3">(SUR)MOF configuration</h5>

      <Accordion defaultActiveKey="mof-fragments" className="mof-fragments-section mb-4">
        <Accordion.Item eventKey="mof-fragments">
          <Accordion.Header>(ionic) (SUR)MOF fragments</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
                <Button
                  size="sm"
                  variant={extraCols.smiles ? 'secondary' : 'outline-secondary'}
                  active={extraCols.smiles}
                  onClick={() => toggleCol('smiles')}
                >
                  SMILES
                </Button>
                <Button
                  size="sm"
                  variant={extraCols.inchikey ? 'secondary' : 'outline-secondary'}
                  active={extraCols.inchikey}
                  onClick={() => toggleCol('inchikey')}
                >
                  InChIKey
                </Button>
                <Button
                  size="sm"
                  variant={extraCols.comment ? 'secondary' : 'outline-secondary'}
                  active={extraCols.comment}
                  onClick={() => toggleCol('comment')}
                >
                  Comment
                </Button>
                {!disabled && (
                  <Button size="sm" variant="primary" onClick={addFragment} aria-label="Add fragment">
                    <i className="fa fa-plus" />
                  </Button>
                )}
              </div>
              <Table bordered size="sm" className="mof-fragments-table mb-0">
        <thead>
          <tr>
            <th style={{ width: '11%' }}>Type/Function</th>
            <th>Molecule</th>
            {extraCols.smiles && <th>SMILES</th>}
            {extraCols.inchikey && <th>InChIKey</th>}
            <th style={{ width: '22%' }}>IUPAC</th>
            <th style={{ width: '6%' }}>Ratio</th>
            {extraCols.comment && <th>Comment</th>}
            {!disabled && <th style={{ width: '48px', whiteSpace: 'nowrap' }} aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {fragments.length === 0 && (
            <tr>
              <td
                colSpan={4 + (extraCols.smiles ? 1 : 0) + (extraCols.inchikey ? 1 : 0)
                  + (extraCols.comment ? 1 : 0) + (disabled ? 0 : 1)}
                className="text-muted text-center py-3"
              >
                No fragments yet.
                {!disabled && ' Use the + button to add one.'}
              </td>
            </tr>
          )}
          {fragments.map((frag, index) => {
            const svgSrc = frag.svg_file ? `/images/molecules/${frag.svg_file}` : null;
            const name = frag.sum_formula || frag.iupac || frag.smiles || '';
            return (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td>{cell(index, 'type_function')}</td>
                <td className="align-middle text-start">
                  {svgSrc ? (
                    <OverlayTrigger
                      trigger={['hover', 'focus']}
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
                      <span className="text-break" role="button" tabIndex={0}>{name}</span>
                    </OverlayTrigger>
                  ) : (
                    <span className="text-break">
                      {name || <span className="text-muted">(no structure)</span>}
                    </span>
                  )}
                </td>
                {extraCols.smiles && <td>{cell(index, 'smiles', 'SMILES', () => resolveRow(index))}</td>}
                {extraCols.inchikey && (
                  <td className="align-middle text-break font-monospace small">{frag.inchikey || ''}</td>
                )}
                <td>{cell(index, 'iupac')}</td>
              <td>
                <NumeralInputWithUnitsCompo
                  precision={4}
                  value={frag.ratio == null || frag.ratio === '' ? 1 : (Number(frag.ratio) || 0)}
                  disabled={disabled}
                  onChange={(e) => updateRatio(index, e.value)}
                />
              </td>
              {extraCols.comment && <td>{cell(index, 'comment')}</td>}
              {!disabled && (
                <td className="text-center align-middle" style={{ width: '48px', whiteSpace: 'nowrap' }}>
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

      <Accordion defaultActiveKey="mof-defects" className="mof-defects-section mt-4">
        <Accordion.Item eventKey="mof-defects">
          <Accordion.Header>Defects</Accordion.Header>
          <Accordion.Body>
            {!disabled && (
              <div className="d-flex justify-content-end mb-2">
                <Button size="sm" variant="primary" onClick={addDefect} aria-label="Add defect">
                  <i className="fa fa-plus" />
                </Button>
              </div>
            )}
            <Table bordered size="sm" className="mof-defects-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Type of defect</th>
                  <th>Description</th>
                  {!disabled && <th style={{ width: '48px', whiteSpace: 'nowrap' }} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {defects.length === 0 && (
                  <tr>
                    <td colSpan={2 + (disabled ? 0 : 1)} className="text-muted text-center py-3">
                      No defects yet.
                      {!disabled && ' Use the + button to add one.'}
                    </td>
                  </tr>
                )}
                {defects.map((defect, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={index}>
                    <td>{defectCell(index, 'defect_type')}</td>
                    <td>{defectCell(index, 'description')}</td>
                    {!disabled && (
                      <td className="text-center align-middle" style={{ width: '48px', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeDefect(index)}
                          aria-label="Remove defect"
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
    </div>
  );
};

MofDetails.propTypes = {
  onChange: PropTypes.func.isRequired,
  mof: PropTypes.shape({
    fragments: PropTypes.arrayOf(PropTypes.object),
    defects: PropTypes.arrayOf(PropTypes.object),
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
