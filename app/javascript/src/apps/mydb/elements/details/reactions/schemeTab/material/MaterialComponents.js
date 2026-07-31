import React from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import {
  getMetricMol, metricPrefixesMol, metricPrefixesMolConc
} from 'src/utilities/MetricsUtils';
import SampleName from 'src/components/common/SampleName';
import { SampleCode } from 'src/utilities/ElementUtils';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import { permitOn } from 'src/components/common/uis';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import FieldValueSelector from 'src/apps/mydb/elements/details/FieldValueSelector';
import { convertDuration, convertTemperature, convertTonPerTime } from 'src/models/Reaction';

const VOLUME_METRIC_PREFIXES = ['m', 'n', 'u'];

/*
Metric prefix of the volume and the mol input. Kept out of the components themselves so the
variations grid can label and switch the very same unit from its column headers.
*/
const volumeMetricPrefix = (material, isSbmm) => {
  if (isSbmm) {
    // SBMM stores explicit unit strings (e.g. L/mL/µL), so derive UI prefix from that unit.
    return material.reactionSchemeMetricPrefix(material.volume_as_used_unit);
  }
  if (
    material.metrics
    && material.metrics.length > 2
    && VOLUME_METRIC_PREFIXES.indexOf(material.metrics[1]) > -1
  ) {
    return material.metrics[1];
  }
  return 'm';
};

// Keeps the SBMM mol prefix synchronized with its dedicated mol unit field.
const molMetricPrefix = (material, isSbmm) => (isSbmm
  ? material.reactionSchemeMetricPrefix(material.amount_as_used_mol_unit)
  : getMetricMol(material));

const NotApplicableInput = ({ className }) => (
  <div>
    <Form.Control
      size="sm"
      type="text"
      value="n/a"
      disabled
      className={`text-align-center ${className}`}
    />
  </div>
);

NotApplicableInput.propTypes = {
  className: PropTypes.string.isRequired
};

// Returns a Tooltip *element* rather than a component: OverlayTrigger clones the
// overlay to inject ref/style/placement/arrowProps, which a wrapper component would swallow.
const iupacNameTooltip = (mh) => {
  const { isSbmm, material } = mh;

  return (
    <Tooltip id="iupac_name_tooltip" className="left_tooltip">
      <div>
        {!isSbmm && material.molecule && (
          <div className="d-flex">
            <div>IUPAC&#58;&nbsp;</div>
            <div style={{ wordBreak: 'break-all' }}>{material.molecule.iupac_name || ''}</div>
          </div>
        )}
        <div className="d-flex">
          <div>Name&#58;&nbsp;</div>
          <div style={{ wordBreak: 'break-all' }}>{material.name || ''}</div>
        </div>
        <div className="d-flex">
          <div>Ext.Label&#58;&nbsp;</div>
          <div style={{ wordBreak: 'break-all' }}>{material.external_label || ''}</div>
        </div>
        <div className="d-flex">
          <div>Short Label&#58;&nbsp;</div>
          <div style={{ wordBreak: 'break-all' }}>{material.short_label || ''}</div>
        </div>
      </div>
    </Tooltip>
  );
};

const addToDescTooltip = (
  <Tooltip id="tp-spl-code" className="left_tooltip">
    Add to description or additional information for publication and purification details
  </Tooltip>
);

/**
 * Renders a radio button for selecting this product material as the weight percentage reference.
 *
 * This radio button appears only when weight percentage mode is enabled for the reaction.
 * When checked, this material becomes the reference product used for weight percentage calculations.
 *
 * @param {MaterialHandler} mh - MaterialHandler Object
 * @returns {JSX.Element} Radio button with tooltip or empty div if weight percentage mode is disabled
 */
const ProductReference = ({ mh }) => {
  const { reaction, material } = mh;
  const { handler } = mh;
  return (
    reaction.weight_percentage && !mh.isSbmm ? (
      <div>
        <OverlayTrigger
          overlay={(
            <Tooltip id="weight-percentage-reference-tooltip">
              Select as reference product for weight percentage
            </Tooltip>
          )}
        >
          <Form.Check
            type="radio"
            disabled={!permitOn(reaction)}
            name="weightPercentageReference"
            checked={material.weight_percentage_reference}
            onChange={(e) => handler.referenceChange(e, 'weightPercentageReferenceChanged')}
            size="sm"
            className="reaction-material__custom-radio m-1"
          />
        </OverlayTrigger>
      </div>
    ) : <div aria-label="Empty cell"/>
  );
};

ProductReference.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

/**
 * Renders the concentration field for a material.
 * For mixtures, it finds the reference component and uses its concentration.
 * For regular materials, it uses the material's own concentration value.
 * For SBMM materials, it uses `concentration_rt_value` (reaction-scheme concentration).
 *
 * @param {MaterialHandler} mh - MaterialHandler Object
 * @returns {JSX.Element} A table cell containing the concentration input component
 */
const MaterialConcentration = ({ mh }) => {
  const { handler } = mh;
  return (
    <NumeralInputWithUnitsCompo
      value={mh.concentrationValue}
      className="reaction-material__concentration-data"
      unit="mol/l"
      metricPrefix={mh.metricMolConc}
      metricPrefixes={metricPrefixesMolConc}
      precision={4}
      disabled={mh.isConcentrationDisabled}
      onChange={(e) => handler.concentrationChange(e, mh.concentrationValue)}
      onMetricsChange={handler.metricsChange}
      size="sm"
    />
  );
};

MaterialConcentration.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

/**
 * Renders a nested dual-radio system for selecting material and weight percentage references.
 *
 * This creates a two-level radio button structure:
 * - Outer radio: Selects this material as the weight percentage reference
 * - Inner radio: Selects this material as the limiting reagent reference (standard reference)
 *
 * Visual hierarchy:
 * - Outer circle: Weight percentage reference selection (affects amount calculations)
 * - Inner circle: Standard reference selection (affects amount calculations)
 *
 * Interaction:
 * - Clicking outer radio: Sets weight percentage reference
 * - Clicking inner radio: Sets standard reference (prevents event propagation to outer)
 * - Supports keyboard navigation (Enter/Space keys)
 *
 * Styling:
 * - Dynamic class names based on checked state and disabled state
 * - Outer gets 'checked' class when material.weight_percentage_reference is true
 * - Inner gets 'checked' class when material.reference is true
 *
 * @param {MaterialHandler} mh - MaterialHandler Object* @returns {JSX.Element} Nested radio button structure with
 *   accessibility support
 */
const NestedReferenceRadios = ({ mh }) => {
  const { reaction, material } = mh;

  const isDisabled = !permitOn(reaction);

  const outerClassNames = [
    'reaction-material__nested-radio-outer',
    material.weight_percentage_reference ? 'checked' : '',
    isDisabled ? 'disabled' : ''
  ].filter(Boolean).join(' ');

  const innerClassNames = [
    'reaction-material__nested-radio-inner',
    material.reference ? 'checked' : '',
    isDisabled ? 'disabled' : ''
  ].filter(Boolean).join(' ');

  const handleOuterClick = (e) => {
    e.preventDefault();
    if (isDisabled) {
      return;
    }
    mh.handler.referenceChange(e, 'weightPercentageReferenceChanged');
  };

  const handleInnerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) {
      return;
    }
    mh.handler.referenceChange(e, null);
  };

  const handleKeyDown = (handler) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler(e);
    }
  };

  return (
    <OverlayTrigger
      overlay={(
        <Tooltip id="nested-reference-tooltip">
          Outer Circle: Select Weight % Reference
          <br/>
          Inner Circle: Select Molar Reference
        </Tooltip>
      )}
    >
      <div className="reaction-material__nested-radio-container m-1">
        <div
          className={outerClassNames}
          onClick={handleOuterClick}
          onKeyDown={handleKeyDown(handleOuterClick)}
          tabIndex={0}
          role="radio"
          aria-checked={material.weight_percentage_reference}
          aria-label="Weight percentage reference"
        />
        <div
          className={innerClassNames}
          onClick={handleInnerClick}
          onKeyDown={handleKeyDown(handleInnerClick)}
          tabIndex={0}
          role="radio"
          aria-checked={material.reference}
          aria-label="Molar reference"
        />
      </div>
    </OverlayTrigger>
  );
};

NestedReferenceRadios.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const GasType = ({ mh }) => {
  const {
    gasTypeValue,
    tooltipText,
    isGasTypeActive,
    isSbmmGasSchemeUnavailable
  } = mh.gasTypeValue();
  const tooltip = <Tooltip id="feedstockGas">{tooltipText}</Tooltip>;
  return (
    <div className="pe-1">
      <OverlayTrigger overlay={tooltip}>
          <span className="d-inline-block" style={{ cursor: isSbmmGasSchemeUnavailable ? 'not-allowed' : 'pointer' }}>
            <Button
              variant="light"
              active={isGasTypeActive}
              size="xsm"
              onClick={() => mh.handler.gasTypeChange('gasType', gasTypeValue)}
              disabled={isSbmmGasSchemeUnavailable}
            >
              {gasTypeValue}
            </Button>
          </span>
      </OverlayTrigger>
    </div>
  );
};

GasType.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const MaterialNameWithIupac = ({ mh, index, withStickyName }) => {
  const { materialGroup, reaction, material } = mh;

  // Check if this is an SBMM sample
  const { isSbmm } = mh;

  // Check if the material is a mixture
  const isMixture = material.isMixture && material.isMixture();

  // Skip shortLabel for reactants and solvents/purification_solvents, and mixtures
  const skipIupacName = (
    materialGroup === 'reactants'
    || materialGroup === 'solvents'
    || materialGroup === 'purification_solvents'
    || isMixture
    || isSbmm
  );

  let materialName = '';
  let moleculeIupacName = '';

  const idCheck = /^\d+$/;
  let linkDisplayName = true;
  let materialDisplayName = '';

  if (skipIupacName) {
    if (isSbmm) {
      // For SBMM samples, show the short label or name
      materialDisplayName = material.name || material.short_label;
    } else if (isMixture) {
      // For mixtures, show the sample name or short label directly
      materialDisplayName = material.name || material.short_label;
    } else {
      materialDisplayName = material.molecule_iupac_name || material.name;
      if (materialGroup === 'solvents' || materialGroup === 'purification_solvents') {
        materialDisplayName = material.external_label || materialDisplayName;
      }
    }

    if (materialDisplayName === null || materialDisplayName === '') {
      materialDisplayName = (
        <SampleName sample={material}/>
      );
    }
    linkDisplayName = !!idCheck.test(material.id);
  } else {
    moleculeIupacName = material.molecule_iupac_name;
    materialDisplayName = material.title() === ''
      ? <SampleName sample={material}/>
      : material.title();

    linkDisplayName = !material.isNew;
  }
  materialName = linkDisplayName ? (
    <a
      role="link"
      tabIndex={0}
      onClick={() => mh.handler.materialClick()}
    >
      {materialDisplayName}
    </a>
  ) : materialDisplayName;

  const serialCode = SampleCode(index, materialGroup);

  const addToDesc = (e) => {
    e.stopPropagation();
    mh.handler.addToDesc();
  };

  const getNameStyle = () => {
    if (!withStickyName) {
      return {};
    }

    return {
      position: 'sticky',
      left: 0,
      background: '#fff',
      zIndex: 2
    };

  };

  return (
    <div style={getNameStyle()} className="pseudo-table__cell pseudo-table__cell-title align-self-start">
      <div>
        <div className="d-flex align-items-center">
          {reaction.gaseous && materialGroup !== 'solvents'
            ? <GasType mh={mh}/> : null}
          <OverlayTrigger overlay={addToDescTooltip}>
            <Button variant="light" size="xsm" className="me-1" onClick={addToDesc} disabled={!permitOn(reaction)}>
              {serialCode}
            </Button>
          </OverlayTrigger>
          <OverlayTrigger overlay={iupacNameTooltip(mh)}>
            <div className="reaction-material__link">
              {materialName}
            </div>
          </OverlayTrigger>
        </div>
        {moleculeIupacName !== '' && (
          <div className="reaction-material__iupac-name">
            {moleculeIupacName}
          </div>
        )}
      </div>
    </div>
  );
};

MaterialNameWithIupac.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  index: PropTypes.number.isRequired,
  withStickyName: PropTypes.bool.isRequired,
};

const CoefficientField = ({ mh }) => {
  const { material, reaction } = mh;
  return (
    <OverlayTrigger
      overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}
    >
      <div>
        <NumeralInputWithUnitsCompo
          className="reaction-material__coefficient-data"
          size="sm"
          value={material.coefficient ?? 1}
          onChange={mh.handler.coefficientChange}
          name="coefficient"
          disabled={!permitOn(reaction)}
        />
      </div>
    </OverlayTrigger>);
};

CoefficientField.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};
const MassField = ({ mh, metricPrefixes, metric }) => {
  const { lockEquivColumn, materialGroup, material, reaction } = mh;

  const tooltip = (
    <Tooltip id="molecular-weight-info">
      {'molar mass: '}
      {mh.molarWeightValue()}
    </Tooltip>
  );

  const {
    min: rangeStart,
    max: rangeEnd,
    unit: rangeUnit,
    isRangeField
  } = mh.findMinMayUnit('g', (m) => m.amount_g);

  const isAmountDisabledByWeightPercentage = reaction.weight_percentage
    && material.weight_percentage > 0 && materialGroup !== 'products' && !material.weight_percentage_reference;
  return (
    <OverlayTrigger
      overlay={tooltip}
    >
      <div>
        <NumeralInputWithUnitsCompo
          className="reaction-material__mass-data"
          value={material.amount_g}
          isRangeField={isRangeField}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          unit={rangeUnit}
          metricPrefix={metric}
          metricPrefixes={metricPrefixes}
          precision={4}
          disabled={
            isAmountDisabledByWeightPercentage
            || !permitOn(reaction)
            || (materialGroup !== 'products' && !material.reference && lockEquivColumn)
            || material.gas_type === 'feedstock'
            || material.gas_type === 'gas'
          }
          onChange={(e) => mh.handler.debounceHandleAmountUnitChange(e, material.amount_g, material.amountType)}
          onMetricsChange={mh.handler.metricsChange}
          active={material.amount_unit === 'g'}
          isError={material.error_mass}
          size="sm"
          name="molecular-weight"
        />
      </div>
    </OverlayTrigger>
  );
};

MassField.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  metricPrefixes: PropTypes.arrayOf(PropTypes.string).isRequired,
  metric: PropTypes.string.isRequired,
};

const MaterialVolume = ({ mh, className }) => {
  const { material, reaction, materialGroup, lockEquivColumn } = mh;
  if (material.contains_residues) {
    return <NotApplicableInput className={className}/>;
  }
  const {
    density, molarity_value, molarity_unit, has_density, has_molarity
  } = material;
  const tooltip = has_density || has_molarity ? (
    <Tooltip id="density_info">
      {has_density
        ? `density: ${density}`
        : `molarity = ${molarity_value} ${molarity_unit}`}
    </Tooltip>
  ) : (
    <Tooltip id="density_info">no density or molarity defined</Tooltip>
  );

  const metric = volumeMetricPrefix(material, mh.isSbmm);
  const { isAmountDisabledByWeightPercentage } = mh;

  const {
    min: rangeStart,
    max: rangeEnd,
    unit: rangeUnit,
    isRangeField
  } = mh.findMinMayUnit('l', (m) => m.amount_l);

  return (
    <OverlayTrigger overlay={tooltip}>
      <div>
        <NumeralInputWithUnitsCompo
          className={className}
          value={material.amount_l}
          isRangeField={isRangeField}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          unit={rangeUnit}
          metricPrefix={metric}
          metricPrefixes={VOLUME_METRIC_PREFIXES}
          precision={3}
          disabled={!permitOn(reaction)
            || isAmountDisabledByWeightPercentage
            || ((materialGroup !== 'products')
              && !material.reference && lockEquivColumn)
            || material.gas_type === 'gas'}
          onChange={(e) => mh.handler.amountUnitChange(e, material.amount_l, material.amountType)}
          onMetricsChange={mh.handler.metricsChange}
          variant="light"
          active={material.amount_unit === 'l'}
          size="sm"
        />
      </div>
    </OverlayTrigger>
  );
};

MaterialVolume.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  className: PropTypes.string.isRequired,
};

const MaterialAmountMol = ({ mh }) => {
  const { material, reaction, materialGroup, lockEquivColumn } = mh;
  const metricMol = molMetricPrefix(material, mh.isSbmm);

  const isAmountDisabledByWeightPercentage = reaction.weight_percentage
    && material.weight_percentage > 0 && materialGroup !== 'products' && !material.weight_percentage_reference;

  const isDisabled = !permitOn(reaction)
    || isAmountDisabledByWeightPercentage
    || (materialGroup === 'products'
      || (!material.reference && lockEquivColumn));

  const {
    min: rangeStart,
    max: rangeEnd,
    unit: rangeUnit,
    isRangeField
  } = mh.findMinMayUnit('mol', (m) => m.amount_mol);

  return (
    <NumeralInputWithUnitsCompo
      value={material.amount_mol}
      className="reaction-material__molarity-data"
      isRangeField={isRangeField}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      unit={rangeUnit}
      metricPrefix={metricMol}
      metricPrefixes={metricPrefixesMol}
      precision={4}
      disabled={isDisabled}
      onChange={(e) => mh.handler.amountUnitChange(e, material.amount_mol, material.amountType)}
      onMetricsChange={mh.handler.metricsChange}
      variant="light"
      active={material.amount_unit === 'mol'}
      size="sm"
    />
  );
};

MaterialAmountMol.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const MaterialActivity = ({ mh }) => {
  const { material, reaction, materialGroup, lockEquivColumn } = mh;

  const isAmountDisabledByWeightPercentage = reaction.weight_percentage
    && material.weight_percentage > 0 && materialGroup !== 'products' && !material.weight_percentage_reference;

  const isDisabled = !permitOn(reaction)
    || isAmountDisabledByWeightPercentage
    || (materialGroup === 'products'
      || (!material.reference && lockEquivColumn));

  // Check if activity is the active unit
  // For SBMM samples: check if _amount_unit is 'U' (set when activity is the primary amount)
  // For regular samples: check if amount_unit is 'U'
  // eslint-disable-next-line no-underscore-dangle
  const isActivityActive = (material._amount_unit === 'U') || (material.amount_unit === 'U');

  return (
    <NumeralInputWithUnitsCompo
      value={material.activity_value}
      className="reaction-material__activity-data"
      unit={material.activity_unit || 'U'}
      precision={4}
      disabled={isDisabled}
      onChange={(e) => mh.handler.amountUnitChange(e, material.activity_value, material.amountType)}
      onMetricsChange={mh.handler.metricsChange}
      variant="light"
      active={isActivityActive}
      size="sm"
    />
  );
};

MaterialActivity.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const MaterialLoading = ({ mh, showLoadingColumn }) => {
  const { material, lockEquivColumn, materialGroup, reaction } = mh;
  if (!showLoadingColumn) {
    return false;
  }
  if (!material.contains_residues) {
    return <NotApplicableInput className={'reaction-material__loading-data'}/>;
  }

  return (
    <NumeralInputWithUnitsCompo
      className="reaction-material__loading-data"
      value={material.loading}
      unit="mmol/g"
      metricPrefix="n"
      metricPrefixes={['n']}
      isError={material.error_loading}
      size="sm"
      precision={3}
      disabled={
        !permitOn(reaction)
        || (materialGroup === 'products'
          || (!material.reference && lockEquivColumn))
      }
      onChange={(loading) => mh.handler.loadingChange(loading)}
    />
  );
};

MaterialLoading.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  showLoadingColumn: PropTypes.bool.isRequired
};

/**
 * Renders a dual-purpose field selector/input for equivalent or weight percentage values.
 *
 * This component allows users to switch between two modes:
 * 1. Molar mass mode: Shows and edits the material's equivalent value
 * 2. Weight percentage mode: Shows and edits the material's weight percentage value
 *
 * Weight percentage field is conditionally disabled when:
 * - No weight percentage reference material is set in the reaction
 * - Target amount weight percentage reference materialis invalid (NaN or 0)
 * - Current material is itself the weight percentage reference
 *
 * @returns {JSX.Element} FieldValueSelector component with mode switching capability
 */
const CustomFieldValueSelector = ({ mh }) => {
  const {
    material,
    reaction,
    lockEquivColumn,
    fieldToShow,
    equivalentField,
    valueToShow,
    disableWeightPercentageField
  } = mh.preparationCustomField();

  return (
    <FieldValueSelector
      className="reaction-material__equivalent-data"
      fieldOptions={['molar mass', 'weight percentage']}
      onFirstRenderField={fieldToShow}
      value={valueToShow}
      onChange={(e) => {
        mh.handler.valueChange(e, equivalentField);
      }}
      onFieldChange={(field) => mh.handler.equivalentWeightPercentageChange(field)}
      disableSpecificField={disableWeightPercentageField}
      disabled={
        !permitOn(reaction) || material.reference || lockEquivColumn
      }
      weightPercentageReference={material.weight_percentage_reference}
    />
  );
};

CustomFieldValueSelector.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const ConversionRateField = ({ mh }) => {
  const { reaction, material } = mh;
  const condition = material.conversion_rate / 100 > 1;
  const allowedConversionRateValue = material.conversion_rate && condition
    ? 100
    : material.conversion_rate;
  return (
    <NumeralInputWithUnitsCompo
      className="reaction-material__yield-data"
      precision={4}
      value={allowedConversionRateValue || 'n.d.'}
      unit="%"
      disabled={!permitOn(reaction)}
      onChange={(e) => mh.handler.conversionRateChange(e)}
      size="sm"
    />
  );
};

ConversionRateField.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const YieldOrConversionRate = ({ mh, displayYieldField }) => {
  if (displayYieldField === true || displayYieldField === null) {
    const yieldMessage = (
      <>
        The final yield value calculated upon saving the reaction
        is based on the real amount field value of this product.
      </>
    );
    return (
      <div>
        <OverlayTrigger
          overlay={(
            <Tooltip id="yield-tooltip">
              {yieldMessage}
            </Tooltip>
          )}
        >
          <Form.Control
            className="reaction-material__yield-data"
            name="yield"
            type="text"
            bsClass="bs-form--compact form-control"
            size="sm"
            value={mh.calculateYield() || 'n.d.'}
            disabled
          />
        </OverlayTrigger>
      </div>
    );
  }
  return <ConversionRateField mh={mh}/>;
};

YieldOrConversionRate.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  displayYieldField: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf([null]),
  ]),
};

const EquivalentOrYield = ({ mh, displayYieldField }) => {
  const { material, reaction, lockEquivColumn, isSbmm } = mh;
  if (mh.isProduct) {
    if (reaction.isInteractionReaction()) {
      return null; // equivalent and yield not relevant for interaction reactions, and conversion rate is not
                   // applicable for products, so we return null to render an empty cell.
    }
    return <YieldOrConversionRate mh={mh} displayYieldField={displayYieldField}/>;
  }

  const {
    min: rangeStart,
    max: rangeEnd,
    isRangeField
  } = mh.findMinMayUnit('', (m) => m.equivalent);

  if (reaction.weight_percentage && !isSbmm) {
    return <CustomFieldValueSelector mh={mh}/>;
  }
  return (
      <NumeralInputWithUnitsCompo
        className="reaction-material__equivalent-data"
        isRangeField={isRangeField}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        size="sm"
        precision={4}
        value={material.equivalent}
        disabled={
          !permitOn(reaction) || ((((material.reference || false)
            && material.equivalent) !== false) || lockEquivColumn)
        }
        onChange={(e) => mh.handler.equivalentChange(e)}
      />
    );
};

EquivalentOrYield.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  displayYieldField: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf([null]),
  ]),
};

const SwitchTargetReal = ({ mh }) => {
  const { reaction, material } = mh;
  const isTarget = material.amountType === 'target';
  const isDisabled = !permitOn(reaction);

  return (
    <Button
      className="reaction-material__target-data"
      disabled={isDisabled}
      onClick={() => mh.handler.toggleTarget()}
      variant="light"
      active={isTarget}
      size="sm"
    >
      {isTarget ? 'T' : 'R'}
    </Button>
  );
};

SwitchTargetReal.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const DrySolventCheckBox = ({ mh }) => {
  const drySolvTooltip = <Tooltip>Dry Solvent</Tooltip>;
  const { material } = mh;
  return (<OverlayTrigger overlay={drySolvTooltip}>
    <Form.Check
      type="checkbox"
      checked={material.dry_solvent}
      onChange={(event) => mh.handler.drySolventChange(event)}
      className="ms-1"
    />
  </OverlayTrigger>);
};

DrySolventCheckBox.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const VolumeRatio = ({ mh }) => {
  const { reaction, material } = mh;
  return (
    <Form.Control
      className="reaction-material__volume-ratio-data"
      type="text"
      size="sm"
      value={reaction.volumeRatioByMaterialId(material.id)}
      disabled
    />);
};

VolumeRatio.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const MaterialRef = ({ mh }) => {
  const { materialGroup, reaction, material } = mh;
  if (materialGroup === 'products') {
    return <div><ProductReference mh={mh}/></div>;
  }

  if (reaction.weight_percentage && !mh.isSbmm) {
    return <div><NestedReferenceRadios  mh={mh}/></div>;
  }

  return (
    <div>
      <Form.Check
        type="radio"
        disabled={!permitOn(reaction)}

        checked={material.reference}
        onChange={(e) => mh.handler.referenceChange(e)}
        size="sm"
        className="m-1"
      />
    </div>
  );
};

MaterialRef.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

const getFormattedValue = (value) => {
  if (value == null || value === '') return 'n.d';

  const num = Number(value);
  if (Number.isNaN(num)) return 'n.d';

  return num;
};

const GaseousInputFields = ({ mh, field }) => {
  const { material } = mh;
  const gasPhaseData = material.gas_phase_data || {};
  const { value, unit } = mh.getFieldData(field, gasPhaseData);
  const readOnly = field === 'turnover_frequency' || field === 'turnover_number';

  const updateValue = getFormattedValue(value);
  const message = 'Unit switch only active with valid values';
  const noSwitchUnits = ['ppm', 'TON'];
  const {
    min: rangeStart,
    max: rangeEnd,
    isRangeField,
    unit: rangeUnit
  } = mh.findMinMayUnit(unit, (m) => {
    const vGasPhaseData = m.gas_phase_data || {};
    return mh.getFieldData(field, vGasPhaseData, unit)?.value;
  });
  let convertedRangeStart, convertedRangeEnd;
  if (isRangeField) {
    const converter = (origenValue, origenUnit, targetUnit) => {
      if (field === 'temperature') {
        return convertTemperature(origenValue, origenUnit, targetUnit);
      } else if (field === 'time') {
        return convertDuration(origenValue, origenUnit, targetUnit);
      } else if (field === 'turnover_frequency') {
        return convertTonPerTime(origenValue, 'TON/h', targetUnit);
      }
      return origenValue;
    };
    convertedRangeStart = converter(rangeStart, rangeUnit, unit);
    convertedRangeEnd = converter(rangeEnd, rangeUnit, unit);
  }
  const inputComponent = (
    <NumeralInputWithUnitsCompo
      size="sm"
      precision={4}
      active
      value={updateValue}
      disabled={readOnly}
      onMetricsChange={(e) => mh.handler.gasFieldsUnitsChanged(e, field)}
      onChange={(e) => mh.handler.gasFieldsChange(field, e, value)}
      unit={unit}
      isRangeField={isRangeField}
      rangeStart={convertedRangeStart}
      rangeEnd={convertedRangeEnd}
    />
  );

  return (
    (value === 'n.d' || !value) && !noSwitchUnits.includes(unit) ? (
      <OverlayTrigger
        overlay={<Tooltip id={`${field}-tooltip`}>{message}</Tooltip>}
      >
        <div>{inputComponent}</div>
      </OverlayTrigger>
    ) : (
      inputComponent
    )
  );
};

GaseousInputFields.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  field: PropTypes.string.isRequired,
};

const GaseousProductRow = ({ mh }) => (
    <div className="reaction-material__gaseous-fields-data">
      <div className="reaction-material__ref-data"/>
      <GaseousInputFields field={'time'} mh={mh}/>
      <GaseousInputFields field={'temperature'} mh={mh}/>
      <GaseousInputFields field={'part_per_million'} mh={mh}/>
      <GaseousInputFields field={'turnover_number'} mh={mh}/>
      <GaseousInputFields field={'turnover_frequency'} mh={mh}/>
    </div>
  );

GaseousProductRow.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired
};

export {
  ProductReference,
  MaterialConcentration,
  NestedReferenceRadios,
  GasType,
  MaterialNameWithIupac,
  MassField,
  CoefficientField,
  MaterialVolume,
  MaterialAmountMol,
  MaterialActivity,
  MaterialLoading,
  EquivalentOrYield,
  SwitchTargetReal,
  DrySolventCheckBox,
  VolumeRatio,
  MaterialRef,
  GaseousInputFields,
  GaseousProductRow,
  VOLUME_METRIC_PREFIXES,
  volumeMetricPrefix,
  molMetricPrefix
};