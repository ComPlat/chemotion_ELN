import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  Form,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { debounce } from 'lodash';
import MaterialCalculations from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialCalculations';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import SampleName from 'src/components/common/SampleName';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { SampleCode, isSbmmSample } from 'src/utilities/ElementUtils';
import {
  getMetricMol, metricPrefixesMol, metricPrefixesMolConc, getMetricMolConc
} from 'src/utilities/MetricsUtils';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitOn } from 'src/components/common/uis';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import cs from 'classnames';
import DragHandle from 'src/components/common/DragHandle';
import DeleteButton from 'src/components/common/DeleteButton';
import ReactionMaterialComponentsGroup
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionMaterialComponentsGroup';
import ComponentModel from 'src/models/Component';
import FieldValueSelector from 'src/apps/mydb/elements/details/FieldValueSelector';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import useMixtureComponents from 'src/apps/mydb/elements/details/reactions/schemeTab/hooks/useMixtureComponents';
import useFieldSelector from 'src/apps/mydb/elements/details/reactions/schemeTab/hooks/useFieldSelector';

// ---------- static helpers ----------

const notApplicableInput = (className) => (
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

const iupacNameTooltip = (material) => {
  const isSbmm = isSbmmSample(material);

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

const refreshSvgTooltip = (
  <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>
);

const AddtoDescToolTip = (
  <Tooltip id="tp-spl-code" className="left_tooltip">
    Add to description or additional information for publication and purification details
  </Tooltip>
);

function getFieldData(field, gasPhaseData) {
  switch (field) {
    case 'turnover_number':
      return { value: gasPhaseData.turnover_number, unit: 'TON', isTimeField: false };
    case 'part_per_million':
      return { value: gasPhaseData.part_per_million, unit: 'ppm', isTimeField: false };
    case 'time':
      return { value: gasPhaseData.time?.value, unit: gasPhaseData.time?.unit, isTimeField: true };
    default:
      return { value: gasPhaseData[field]?.value, unit: gasPhaseData[field]?.unit, isTimeField: false };
  }
}

function isFieldReadOnly(field) {
  return field === 'turnover_frequency' || field === 'turnover_number';
}

function getFormattedValue(value) {
  if (value == null || value === '') return 'n.d';
  const num = Number(value);
  if (Number.isNaN(num)) return 'n.d';
  return num;
}

function getMassMetricPrefix(material) {
  const metricPrefixes = ['m', 'n', 'u'];
  if (isSbmmSample(material)) {
    return material.reactionSchemeMetricPrefix(material.amount_as_used_mass_unit);
  }
  if (
    material.metrics
    && material.metrics.length > 2
    && metricPrefixes.indexOf(material.metrics[0]) > -1
  ) {
    return material.metrics[0];
  }
  return 'm';
}

function getVolumeMetricPrefix(material) {
  const metricPrefixes = ['m', 'n', 'u'];
  if (isSbmmSample(material)) {
    return material.reactionSchemeMetricPrefix(material.volume_as_used_unit);
  }
  if (
    material.metrics
    && material.metrics.length > 2
    && metricPrefixes.indexOf(material.metrics[1]) > -1
  ) {
    return material.metrics[1];
  }
  return 'm';
}

// ---------- main component ----------

function Material({
  reaction,
  material,
  materialGroup,
  deleteMaterial,
  onChange,
  showLoadingColumn,
  index,
  lockEquivColumn,
  displayYieldField,
  dragRef,
  dropRef,
  isOver,
  canDrop,
  isDragging,
}) {
  const isSbmm = useMemo(() => isSbmmSample(material), [material]);
  const { fieldToShow, setFieldToShow } = useFieldSelector(material);
  const {
    showComponents,
    mixtureComponents,
    setMixtureComponents,
    mixtureComponentsLoading,
    toggleComponentsAccordion,
  } = useMixtureComponents(material);

  const materialId = material.id;

  // ---------- event emitters ----------

  const emitChange = useCallback((event) => {
    if (onChange) onChange(event);
  }, [onChange]);

  const handleAmountUnitChange = useCallback((e, value, amountType = null) => {
    if (e.value === value) return;
    emitChange({
      amount: e,
      type: 'amountUnitChanged',
      materialGroup,
      sampleID: materialId,
      amountType,
      isSbmm,
    });
  }, [emitChange, materialGroup, materialId, isSbmm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceHandleAmountUnitChange = useCallback(
    debounce(handleAmountUnitChange, 500),
    [handleAmountUnitChange]
  );

  const handleMetricsChange = useCallback((e) => {
    emitChange({
      metricUnit: e.metricUnit,
      metricPrefix: e.metricPrefix,
      type: 'MetricsChanged',
      materialGroup,
      sampleID: materialId,
      isSbmm,
    });
  }, [emitChange, materialGroup, materialId, isSbmm]);

  const handleCoefficientChange = useCallback((e) => {
    emitChange({
      coefficient: e.value,
      type: 'coefficientChanged',
      materialGroup,
      sampleID: materialId,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleEquivalentChange = useCallback((e) => {
    emitChange({
      type: 'equivalentChanged',
      materialGroup,
      sampleID: materialId,
      isSbmm,
      equivalent: e.value,
      weightPercentageField: e.weightPercentageField || false,
    });
  }, [emitChange, materialGroup, materialId, isSbmm]);

  const handleWeightPercentageChange = useCallback((weightPercentage) => {
    emitChange({
      type: 'weightPercentageChanged',
      materialGroup,
      sampleID: materialId,
      weightPercentage,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleReferenceChange = useCallback((e, type = null) => {
    emitChange({
      type: type ? 'weightPercentageReferenceChanged' : 'referenceChanged',
      materialGroup,
      sampleID: materialId,
      value: e.target.value,
      isSbmm,
    });
    setFieldToShow('molar mass');
  }, [emitChange, materialGroup, materialId, isSbmm, setFieldToShow]);

  const handleAmountTypeChange = useCallback((amountType) => {
    emitChange({
      amountType,
      type: 'amountTypeChanged',
      materialGroup,
      sampleID: materialId,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleLoadingChange = useCallback((newLoading) => {
    material.residues[0].custom_info.loading = newLoading.value;
    emitChange({
      type: 'amountChanged',
      materialGroup,
      sampleID: materialId,
      amount: material.amount,
    });
  }, [emitChange, materialGroup, materialId, material]);

  const handleConversionRateChange = useCallback((e) => {
    emitChange({
      type: 'conversionRateChanged',
      materialGroup,
      sampleID: materialId,
      conversionRate: e.value,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleGasTypeChange = useCallback((gasType, value) => {
    emitChange({
      type: gasType,
      materialGroup,
      sampleID: materialId,
      value,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleGasFieldsChange = useCallback((field, e, currentValue) => {
    if (e.value !== undefined && e.unit !== undefined && e.value !== currentValue) {
      emitChange({
        type: 'gasFieldsChanged',
        materialGroup,
        sampleID: materialId,
        value: e.value,
        unit: e.unit,
        field,
      });
    }
  }, [emitChange, materialGroup, materialId]);

  const gasFieldsUnitsChanged = useCallback((e, field) => {
    emitChange({
      unit: e.metricUnit,
      value: e.value === '' ? 0 : e.value,
      field,
      type: 'gasFieldsUnitsChanged',
      materialGroup,
      sampleID: materialId,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleExternalLabelChange = useCallback((event) => {
    emitChange({
      type: 'externalLabelChanged',
      materialGroup,
      sampleID: materialId,
      externalLabel: event.target.value,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleExternalLabelCompleted = useCallback(() => {
    emitChange({ type: 'externalLabelCompleted' });
  }, [emitChange]);

  const handleDrySolventChange = useCallback((event) => {
    emitChange({
      type: 'drysolventChanged',
      materialGroup,
      sampleID: materialId,
      dry_solvent: event.target.checked,
    });
  }, [emitChange, materialGroup, materialId]);

  const handleShowLabelChange = useCallback(() => {
    // Toggle show_label is handled by the reaction through onChange
    // The original class component didn't actually emit an event here
    // It toggled the material.show_label directly via reaction
  }, []);

  const handleAddToDesc = useCallback(() => {
    const paragraph = reaction.buildMaterialParagraph(material, materialGroup);
    emitChange({ type: 'addToDesc', paragraph });
  }, [emitChange, reaction, material, materialGroup]);

  const handleMaterialClick = useCallback((sample) => {
    const sampleIsSbmm = isSbmmSample(sample);
    aviatorNavigation(sample.type, sample.id, true, false);
    if (sampleIsSbmm) {
      ElementActions.fetchSequenceBasedMacromoleculeSampleById(sample.id);
    } else {
      sample.updateChecksum();
      ElementActions.showReactionMaterial({ sample, reaction });
    }
  }, [reaction]);

  const handleComponentReferenceChange = useCallback((changeEvent) => {
    if (changeEvent.type === 'componentReferenceChanged') {
      const updated = [...mixtureComponents];
      updated.forEach((comp) => {
        const isReference = comp.id === changeEvent.componentId;
        if (comp.reference !== isReference) {
          comp.reference = isReference;
        }
      });
      setMixtureComponents(updated);
      emitChange({
        ...changeEvent,
        sampleID: material.id,
        materialGroup,
      });
    }
  }, [mixtureComponents, setMixtureComponents, emitChange, material.id, materialGroup]);

  const handleComponentMetricsChange = useCallback((changeEvent) => {
    emitChange({
      ...changeEvent,
      sampleID: material.id,
      materialGroup,
    });
  }, [emitChange, material.id, materialGroup]);

  const handleOnValueChange = useCallback((e, equivalentField) => {
    if (equivalentField) {
      handleEquivalentChange({ value: e });
    } else {
      handleWeightPercentageChange(e);
    }
  }, [handleEquivalentChange, handleWeightPercentageChange]);

  const handleEquivalentWeightPercentageChange = useCallback((mat, field) => {
    setFieldToShow(field);
    if (field === 'weight percentage') {
      if (mat.reference) {
        handleEquivalentChange({ value: 1 });
      } else if (!mat.weight_percentage_reference) {
        handleEquivalentChange({ value: 0, weightPercentageField: true });
      }
    } else if (field === 'molar mass') {
      if (!mat.reference) {
        if (mat.weight_percentage_reference) {
          handleWeightPercentageChange(1);
        } else {
          handleWeightPercentageChange(null);
        }
      }
    }
  }, [setFieldToShow, handleEquivalentChange, handleWeightPercentageChange]);

  const toggleTarget = useCallback((isTarget) => {
    handleAmountTypeChange(!isTarget ? 'target' : 'real');
  }, [handleAmountTypeChange]);

  // ---------- render helpers ----------

  const rowClassNames = cs(
    'reaction-material pseudo-table__row',
    {
      'draggable-list-item--is-dragging': isDragging,
      'draggable-list-item--is-over': isOver,
      'draggable-list-item--can-drop': canDrop,
    }
  );

  const isDisabled = !permitOn(reaction);
  const isAmountDisabledByWeightPercentage = reaction.weight_percentage
    && material.weight_percentage > 0 && materialGroup !== 'products' && !material.weight_percentage_reference;

  const renderMaterialRef = () => {
    if (materialGroup === 'products') {
      return <div>{renderProductReference()}</div>;
    }
    if (reaction.weight_percentage && !isSbmmSample(material)) {
      return <div>{renderNestedReferenceRadios()}</div>;
    }
    return (
      <div>
        <Form.Check
          type="radio"
          disabled={isDisabled}
          name="reference"
          checked={material.reference}
          onChange={(e) => handleReferenceChange(e)}
          size="sm"
          className="m-1"
        />
      </div>
    );
  };

  const renderMaterialShowLabel = () => (
    <Button
      className="p-1 ms-1"
      onClick={() => handleShowLabelChange()}
      variant="light"
      active={material.show_label}
      size="sm"
      title={material.show_label ? 'Switch to structure' : 'Switch to label'}
    >
      {material.show_label ? 'l' : 's'}
    </Button>
  );

  const renderMaterialLoading = () => {
    if (!showLoadingColumn) return false;
    if (!material.contains_residues) return notApplicableInput('reaction-material__loading-data');
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
        disabled={isDisabled || (materialGroup === 'products' || (!material.reference && lockEquivColumn))}
        onChange={(loading) => handleLoadingChange(loading)}
      />
    );
  };

  const renderMaterialConcentration = () => {
    const metricMolConc = getMetricMolConc(material);
    const concentrationValue = isSbmmSample(material)
      ? material.concentration_rt_value
      : material.concn;
    return (
      <NumeralInputWithUnitsCompo
        value={concentrationValue}
        className="reaction-material__concentration-data"
        unit="mol/l"
        metricPrefix={metricMolConc}
        metricPrefixes={metricPrefixesMolConc}
        precision={4}
        disabled
        onChange={(e) => handleAmountUnitChange(e, concentrationValue)}
        onMetricsChange={handleMetricsChange}
        size="sm"
      />
    );
  };

  const renderMaterialVolume = (className) => {
    if (material.contains_residues) return notApplicableInput(className);

    const { density, molarity_value, molarity_unit, has_density, has_molarity } = material;
    const tooltip = has_density || has_molarity ? (
      <Tooltip id="density_info">
        {has_density ? `density: ${density}` : `molarity = ${molarity_value} ${molarity_unit}`}
      </Tooltip>
    ) : (
      <Tooltip id="density_info">no density or molarity defined</Tooltip>
    );

    const metric = getVolumeMetricPrefix(material);
    const metricPrefixes = ['m', 'n', 'u'];

    return (
      <OverlayTrigger overlay={tooltip}>
        <div>
          <NumeralInputWithUnitsCompo
            className={className}
            value={material.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            disabled={isDisabled
              || isAmountDisabledByWeightPercentage
              || ((materialGroup !== 'products') && !material.reference && lockEquivColumn)
              || material.gas_type === 'gas'}
            onChange={(e) => handleAmountUnitChange(e, material.amount_l, material.amountType)}
            onMetricsChange={handleMetricsChange}
            variant="light"
            active={material.amount_unit === 'l'}
            size="sm"
          />
        </div>
      </OverlayTrigger>
    );
  };

  const renderMaterialAmountMol = () => {
    const metricMol = isSbmmSample(material)
      ? material.reactionSchemeMetricPrefix(material.amount_as_used_mol_unit)
      : getMetricMol(material);

    const molDisabled = isDisabled
      || isAmountDisabledByWeightPercentage
      || (materialGroup === 'products' || (!material.reference && lockEquivColumn));

    return (
      <NumeralInputWithUnitsCompo
        value={material.amount_mol}
        className="reaction-material__molarity-data"
        unit="mol"
        metricPrefix={metricMol}
        metricPrefixes={metricPrefixesMol}
        precision={4}
        disabled={molDisabled}
        onChange={(e) => handleAmountUnitChange(e, material.amount_mol, material.amountType)}
        onMetricsChange={handleMetricsChange}
        variant="light"
        active={material.amount_unit === 'mol'}
        size="sm"
      />
    );
  };

  const renderMaterialActivity = () => {
    const activityDisabled = isDisabled
      || isAmountDisabledByWeightPercentage
      || (materialGroup === 'products' || (!material.reference && lockEquivColumn));
    // eslint-disable-next-line no-underscore-dangle
    const isActivityActive = (material._amount_unit === 'U') || (material.amount_unit === 'U');

    return (
      <NumeralInputWithUnitsCompo
        value={material.activity_value}
        className="reaction-material__activity-data"
        unit={material.activity_unit || 'U'}
        precision={4}
        disabled={activityDisabled}
        onChange={(e) => handleAmountUnitChange(e, material.activity_value, material.amountType)}
        onMetricsChange={handleMetricsChange}
        variant="light"
        active={isActivityActive}
        size="sm"
      />
    );
  };

  const renderMassField = (metricPrefixes, metric) => {
    const tooltip = (
      <Tooltip id="molecular-weight-info">
        {'molar mass: '}
        {reaction.getMolarWeightDisplay(material)}
      </Tooltip>
    );

    return (
      <OverlayTrigger overlay={tooltip}>
        <div>
          <NumeralInputWithUnitsCompo
            className="reaction-material__mass-data"
            value={material.amount_g}
            unit="g"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={4}
            disabled={
              isAmountDisabledByWeightPercentage
              || isDisabled
              || (materialGroup !== 'products' && !material.reference && lockEquivColumn)
              || material.gas_type === 'feedstock'
              || material.gas_type === 'gas'
            }
            onChange={(e) => debounceHandleAmountUnitChange(e, material.amount_g, material.amountType)}
            onMetricsChange={handleMetricsChange}
            active={material.amount_unit === 'g'}
            isError={material.error_mass}
            size="sm"
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  };

  const renderConversionRateField = () => {
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
        disabled={isDisabled}
        onChange={(e) => handleConversionRateChange(e)}
        size="sm"
      />
    );
  };

  const renderYieldOrConversionRate = () => {
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    const yieldMessage = (
      <>
        The final yield value calculated upon saving the reaction
        is based on the real amount field value of this product.
      </>
    );
    if (displayYieldField === true || displayYieldField === null) {
      return (
        <div>
          <OverlayTrigger
            overlay={<Tooltip id="yield-tooltip">{yieldMessage}</Tooltip>}
          >
            <Form.Control
              className="reaction-material__yield-data"
              name="yield"
              type="text"
              bsClass="bs-form--compact form-control"
              size="sm"
              value={reaction.calculateYield(material, vesselVolume) || 'n.d.'}
              disabled
            />
          </OverlayTrigger>
        </div>
      );
    }
    return renderConversionRateField();
  };

  const renderEquivalentOrYield = () => {
    if (materialGroup === 'products') {
      return renderYieldOrConversionRate();
    }
    const matIsSbmm = isSbmmSample(material);
    return (reaction.weight_percentage && !matIsSbmm
      ? renderCustomFieldValueSelector()
      : (
        <NumeralInputWithUnitsCompo
          className="reaction-material__equivalent-data"
          size="sm"
          precision={4}
          value={material.equivalent}
          disabled={
            isDisabled || ((((material.reference || false)
            && material.equivalent) !== false) || lockEquivColumn)
          }
          onChange={(e) => handleEquivalentChange(e)}
        />
      )
    );
  };

  const renderCustomFieldValueSelector = () => {
    const equivalentField = fieldToShow === 'molar mass';
    const valueToShow = equivalentField ? material.equivalent : material.weight_percentage;
    let disableWeightPercentageField = false;
    const weightPercentageIsSelected = fieldToShow === 'weight percentage';
    if (weightPercentageIsSelected) {
      const weightPercentageReference = reaction.findWeightPercentageReferenceMaterial();
      const weightPercentageReferenceMaterial = weightPercentageReference?.weightPercentageReference;
      const targetAmountIsNotValid = Number.isNaN(weightPercentageReference?.targetAmount?.value)
        || weightPercentageReference?.targetAmount?.value === 0;
      disableWeightPercentageField = !weightPercentageReferenceMaterial
        || targetAmountIsNotValid
        || material.weight_percentage_reference;
    }

    return (
      <FieldValueSelector
        className="reaction-material__equivalent-data"
        fieldOptions={['molar mass', 'weight percentage']}
        onFirstRenderField={fieldToShow}
        value={valueToShow}
        onChange={(e) => { handleOnValueChange(e, equivalentField); }}
        onFieldChange={(field) => handleEquivalentWeightPercentageChange(material, field)}
        disableSpecificField={disableWeightPercentageField}
        disabled={isDisabled || material.reference || lockEquivColumn}
        weightPercentageReference={material.weight_percentage_reference}
      />
    );
  };

  const renderGaseousInputFields = (field) => {
    const gasPhaseData = material.gas_phase_data || {};
    const { value, unit } = getFieldData(field, gasPhaseData);
    const readOnly = isFieldReadOnly(field);
    const updateValue = getFormattedValue(value);
    const message = 'Unit switch only active with valid values';
    const noSwitchUnits = ['ppm', 'TON'];

    const inputComponent = (
      <NumeralInputWithUnitsCompo
        size="sm"
        precision={4}
        active
        value={updateValue}
        disabled={readOnly}
        onMetricsChange={(e) => gasFieldsUnitsChanged(e, field)}
        onChange={(e) => handleGasFieldsChange(field, e, value)}
        unit={unit}
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

  const renderGaseousProductRow = () => (
    <div className="reaction-material__gaseous-fields-data">
      <div className="reaction-material__ref-data" />
      {renderGaseousInputFields('time')}
      {renderGaseousInputFields('temperature')}
      {renderGaseousInputFields('part_per_million')}
      {renderGaseousInputFields('turnover_number')}
      {renderGaseousInputFields('turnover_frequency')}
    </div>
  );

  const renderSwitchTargetReal = () => {
    const isTarget = material.amountType === 'target';
    return (
      <Button
        className="reaction-material__target-data"
        disabled={isDisabled}
        onClick={() => toggleTarget(isTarget)}
        variant="light"
        active={isTarget}
        size="sm"
      >
        {isTarget ? 'T' : 'R'}
      </Button>
    );
  };

  const renderGasType = () => {
    const isSbmmGasSchemeUnavailable = isSbmm
      && (materialGroup === 'reactants' || materialGroup === 'starting_materials');

    let gasTypeValue = material.gas_type || 'off';
    let tooltipText = 'This material is currently marked as non gaseous type';
    if (material.gas_type === 'off') {
      gasTypeValue = 'off';
    } else if (material.gas_type === 'gas') {
      gasTypeValue = 'gas';
      tooltipText = 'Gas';
    } else if (material.gas_type === 'feedstock') {
      gasTypeValue = 'FES';
      tooltipText = 'Feedstock reference';
    } else if (material.gas_type === 'catalyst') {
      gasTypeValue = 'CAT';
      tooltipText = 'Catalyst reference';
    }

    if (isSbmmGasSchemeUnavailable) {
      tooltipText = 'SBMM samples cannot be marked as gaseous type';
    }
    const gasTypes = ['feedstock', 'catalyst', 'gas'];
    const gasTypeStatus = gasTypes.includes(material?.gas_type);
    const isGasTypeActive = gasTypeStatus && !isSbmmGasSchemeUnavailable;
    const tooltip = <Tooltip id="feedstockGas">{tooltipText}</Tooltip>;
    return (
      <div className="pe-1">
        <OverlayTrigger overlay={tooltip}>
          <span className="d-inline-block" style={{ cursor: isSbmmGasSchemeUnavailable ? 'not-allowed' : 'pointer' }}>
            <Button
              variant="light"
              active={isGasTypeActive}
              size="xsm"
              onClick={() => handleGasTypeChange('gasType', gasTypeValue)}
              disabled={isSbmmGasSchemeUnavailable}
            >
              {gasTypeValue}
            </Button>
          </span>
        </OverlayTrigger>
      </div>
    );
  };

  const renderProductReference = () => (
    reaction.weight_percentage && !isSbmmSample(material) ? (
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
            disabled={isDisabled}
            name="weightPercentageReference"
            checked={material.weight_percentage_reference}
            onChange={(e) => handleReferenceChange(e, 'weightPercentageReferenceChanged')}
            size="sm"
            className="reaction-material__custom-radio m-1"
          />
        </OverlayTrigger>
      </div>
    ) : <div aria-label="Empty cell" />
  );

  const renderNestedReferenceRadios = () => {
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
      if (isDisabled) return;
      handleReferenceChange(e, 'weightPercentageReferenceChanged');
    };

    const handleInnerClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDisabled) return;
      handleReferenceChange(e, null);
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
            <br />
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

  const renderMaterialNameWithIupac = () => {
    const matIsSbmm = isSbmmSample(material);
    const isMixture = material.isMixture && material.isMixture();
    const skipIupacName = (
      materialGroup === 'reactants'
      || materialGroup === 'solvents'
      || materialGroup === 'purification_solvents'
      || isMixture
      || matIsSbmm
    );

    let materialName = '';
    let moleculeIupacName = '';
    const idCheck = /^\d+$/;
    let linkDisplayName = true;
    let materialDisplayName = '';

    if (skipIupacName) {
      if (matIsSbmm) {
        materialDisplayName = material.name || material.short_label;
      } else if (isMixture) {
        materialDisplayName = material.name || material.short_label;
      } else {
        materialDisplayName = material.molecule_iupac_name || material.name;
        if (materialGroup === 'solvents' || materialGroup === 'purification_solvents') {
          materialDisplayName = material.external_label || materialDisplayName;
        }
      }

      if (materialDisplayName === null || materialDisplayName === '') {
        materialDisplayName = <SampleName sample={material} />;
      }
      linkDisplayName = !!idCheck.test(material.id);
    } else {
      moleculeIupacName = material.molecule_iupac_name;
      materialDisplayName = material.title() === ''
        ? <SampleName sample={material} />
        : material.title();
      materialName = (
        <a role="link">
          <span>{materialDisplayName}</span>
        </a>
      );
      linkDisplayName = !material.isNew;
    }

    materialName = linkDisplayName ? (
      <a
        role="link"
        tabIndex={0}
        onClick={() => handleMaterialClick(material)}
      >
        {materialDisplayName}
      </a>
    ) : materialDisplayName;

    const serialCode = SampleCode(index, materialGroup);

    const addToDesc = (e) => {
      e.stopPropagation();
      handleAddToDesc();
    };

    return (
      <div className="pseudo-table__cell pseudo-table__cell-title align-self-start">
        <div>
          <div className="d-flex align-items-center">
            {reaction.gaseous && materialGroup !== 'solvents'
              ? renderGasType() : null}
            <OverlayTrigger overlay={AddtoDescToolTip}>
              <Button variant="light" size="xsm" className="me-1" onClick={addToDesc} disabled={isDisabled}>
                {serialCode}
              </Button>
            </OverlayTrigger>
            <OverlayTrigger overlay={iupacNameTooltip(material)}>
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

  // ---------- layout renders ----------

  const renderSolventMaterial = () => {
    const matIsSbmm = isSbmmSample(material);
    const mw = matIsSbmm
      ? (material.sequence_based_macromolecule?.molecular_weight)
      : (material.molecule && material.molecule.molecular_weight);
    const drySolvTooltip = <Tooltip>Dry Solvent</Tooltip>;
    return (
      <div ref={dropRef} className={rowClassNames}>
        <DragHandle ref={dragRef} />
        {renderMaterialNameWithIupac()}
        <div className="reaction-material__dry-solvent-data">
          <OverlayTrigger overlay={drySolvTooltip}>
            <Form.Check
              type="checkbox"
              checked={material.dry_solvent}
              onChange={(event) => handleDrySolventChange(event)}
              className="ms-1"
            />
          </OverlayTrigger>
        </div>
        {renderSwitchTargetReal()}
        <InputGroup className="reaction-material__solvent-label-data">
          <OverlayTrigger
            overlay={(
              <Tooltip id="molecular-weight-info">
                {material.amount_g}
                g -
                {mw}
                g/mol
              </Tooltip>
            )}
          >
            <Form.Control
              disabled={isDisabled}
              type="text"
              size="sm"
              value={material.external_label}
              placeholder={
                isSbmmSample(material)
                  ? (material.name || material.short_label || '')
                  : (material.molecule?.iupac_name || '')
              }
              onChange={(event) => handleExternalLabelChange(event)}
            />
          </OverlayTrigger>
          <OverlayTrigger overlay={refreshSvgTooltip}>
            <Button
              disabled={materialGroup === 'purification_solvents' || isDisabled}
              onClick={(e) => handleExternalLabelCompleted(e)}
              size="sm"
            >
              <i className="fa fa-refresh" />
            </Button>
          </OverlayTrigger>
        </InputGroup>
        {renderMaterialVolume('reaction-material__solvent-volume-data')}
        <Form.Control
          className="reaction-material__volume-ratio-data"
          type="text"
          size="sm"
          value={reaction.volumeRatioByMaterialId(material.id)}
          disabled
        />
        <DeleteButton
          disabled={isDisabled}
          onClick={() => deleteMaterial(material)}
        />
      </div>
    );
  };

  const renderGeneralMaterial = () => {
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = getMassMetricPrefix(material);

    const isMixture = material.isMixture && material.isMixture();
    const existingComponents = Array.isArray(material.components) ? material.components : [];
    const currentComponents = existingComponents.map((comp) => (
      comp instanceof ComponentModel ? comp : ComponentModel.deserializeData(comp)
    ));
    const hasComponents = currentComponents && currentComponents.length > 0;

    const materialRow = (
      <div ref={dropRef} className={rowClassNames}>
        <DragHandle ref={dragRef} />
        {renderMaterialNameWithIupac()}
        <div className="d-flex flex-column gap-1 py-1">
          <div className="d-flex gap-2 align-items-start">
            {renderMaterialRef()}
            {renderSwitchTargetReal()}
            {isSbmmSample(material) ? (
              <div className="reaction-material__coefficient-data" />
            ) : (
              <OverlayTrigger
                overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}
              >
                <div>
                  <NumeralInputWithUnitsCompo
                    className="reaction-material__coefficient-data"
                    size="sm"
                    value={material.coefficient ?? 1}
                    onChange={handleCoefficientChange}
                    name="coefficient"
                  />
                </div>
              </OverlayTrigger>
            )}
            <div className="reaction-material__amount-data">
              {renderMassField(metricPrefixes, metric)}
              {renderMaterialVolume('reaction-material__volume-data')}
              {renderMaterialAmountMol()}
            </div>
            {isSbmmSample(material) ? (
              <div className="reaction-material__molar-mass-data">
                {renderMaterialActivity()}
              </div>
            ) : (
              <div className="reaction-material__molar-mass-data">
                <OverlayTrigger
                  overlay={<Tooltip id="molar-weight-details">{reaction.getMolarWeightDisplay(material)}</Tooltip>}
                >
                  <span>{reaction.getMolarWeightDisplay(material, true)}</span>
                </OverlayTrigger>
              </div>
            )}
            <div className="reaction-material__density-data">
              {material.has_density ? material.density : 'undefined'}
            </div>
            <div className="reaction-material__purity-data">
              {(material.purity === null || material.purity === undefined || material.purity === '')
                ? 0
                : material.purity}
            </div>
            {renderMaterialLoading()}
            {renderMaterialConcentration()}
            {renderEquivalentOrYield()}
            <div className="reaction-material__delete-data">
              <DeleteButton
                disabled={isDisabled}
                onClick={() => deleteMaterial(material)}
              />
            </div>
          </div>
          {materialGroup === 'products' && (
            <>
              {material.gas_type === 'gas' && reaction.gaseous && renderGaseousProductRow()}
              {material.adjusted_loading && material.error_mass && <MaterialCalculations material={material} />}
            </>
          )}
        </div>
      </div>
    );

    return (
      <>
        {materialRow}

        {isMixture && hasComponents && (
          <Accordion
            className="mixture-components-accordion"
            activeKey={showComponents ? 'components' : null}
            onSelect={toggleComponentsAccordion}
          >
            <Accordion.Item eventKey="components">
              <Accordion.Header className="normal-text-width">Components</Accordion.Header>
              <Accordion.Body>
                <div className="mixture-components-row">
                  {mixtureComponentsLoading ? (
                    <div className="text-center">Loading components...</div>
                  ) : (
                    <ReactionMaterialComponentsGroup
                      components={currentComponents}
                      solvents={material.solvent}
                      sampleId={material.id}
                      onComponentReferenceChange={handleComponentReferenceChange}
                      onComponentMetricsChange={handleComponentMetricsChange}
                    />
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
      </>
    );
  };

  // ---------- main render ----------

  const isSolvent = materialGroup === 'solvents' || materialGroup === 'purification_solvents';
  return isSolvent ? renderSolventMaterial() : renderGeneralMaterial();
}

export default Material;

Material.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired,
  lockEquivColumn: PropTypes.bool.isRequired,
  displayYieldField: PropTypes.bool,
  dragRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  dropRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool.isRequired,
};

Material.defaultProps = {
  lockEquivColumn: false,
  displayYieldField: false,
  isDragging: false,
  canDrop: false,
  isOver: false,
};
