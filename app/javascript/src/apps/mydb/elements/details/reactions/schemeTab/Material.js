import React, { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  Form,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import MaterialCalculations from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialCalculations';

import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitOn } from 'src/components/common/uis';
import cs from 'classnames';
import DragHandle from 'src/components/common/DragHandle';
import DeleteButton from 'src/components/common/DeleteButton';
import ReactionMaterialComponentsGroup
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionMaterialComponentsGroup';

import ComponentModel from 'src/models/Component';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import {
  CoefficientField,
  MassField, MaterialActivity, VolumeRatio,
  MaterialConcentration, MaterialNameWithIupac,
  MaterialVolume, MaterialAmountMol, MaterialLoading, EquivalentOrYield, SwitchTargetReal,
  DrySolventCheckBox, MaterialRef, GaseousProductRow
} from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';

const refreshSvgTooltip = (
  <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>
);

const accordionStorageKey = (materialId) => {
  if (!materialId) {
    return null;
  }
  return `mixture_components_accordion_open:${materialId}`;
};

const restoreAccordionState = ({ id } = {}) => {
  try {
    const key = accordionStorageKey(id);
    if (!key) {
      return false;
    }
    const saved = window.localStorage.getItem(key);
    if (saved === 'true' || saved === 'false') {
      return saved === 'true';
    }
  } catch (e) { /* ignore storage errors */
  }
  // Nothing stored is a boolean answer too - the accordion starts closed.
  return false;
};

const isEmpty = (v) =>
  v === null || v === undefined || Number.isNaN(v) || v === 0;

const rowClassNames = ({ isDragging, isOver, canDrop }) => cs(
    'reaction-material pseudo-table__row',
    {
      'draggable-list-item--is-dragging': isDragging,
      'draggable-list-item--is-over': isOver,
      'draggable-list-item--can-drop': canDrop,
    }
  );

const WrapperDragHandle = ({ dragRef, reaction }) => {
  if (!dragRef) {
    return null;
  }
  const enabled = permitOn(reaction);

  return (
    <DragHandle ref={enabled ? dragRef : null} enabled={enabled}/>
  );
};

WrapperDragHandle.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  dragRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
};

const SolventMaterial = ({ mh,
                           deleteMaterial,
                           dropRef,
                           dragRef,
                           withStickyName,
                           isDragging, isOver, canDrop }) => {
  const { material, reaction, materialGroup } = mh;

  const mw = mh.molecularWeight;
  return (
    <div ref={dropRef} className={rowClassNames({ isDragging, isOver, canDrop })}>
      <WrapperDragHandle dragRef={dragRef} reaction={reaction}/>
      <MaterialNameWithIupac
        mh={mh}
        index={mh.index}
        withStickyName={withStickyName}
      />
      <div className="reaction-material__dry-solvent-data">
        <DrySolventCheckBox mh={mh}/>
      </div>
      <SwitchTargetReal mh={mh}/>
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
            disabled={!permitOn(reaction)}
            type="text"
            size="sm"
            value={material.external_label}
            placeholder={
              mh.isSbmm
                ? (material.name || material.short_label || '')
                : (material.molecule?.iupac_name || '')
            }
            onChange={(event) => mh.handler.externalLabelChange(event)}
          />
        </OverlayTrigger>
        <OverlayTrigger overlay={refreshSvgTooltip}>
          <Button
            disabled={materialGroup === 'purification_solvents' || !permitOn(reaction)}
            onClick={(e) => mh.handler.externalLabelCompleted(e)}
            size="sm"
          >
            <i className="fa fa-refresh"/>
          </Button>
        </OverlayTrigger>
      </InputGroup>
      <MaterialVolume mh={mh} className={'reaction-material__solvent-volume-data'}/>
      <VolumeRatio mh={mh} />
      <DeleteButton
        disabled={!permitOn(reaction)}
        onClick={() => deleteMaterial(material)}
      />
    </div>
  );
};

SolventMaterial.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  dragRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  dropRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  index:  PropTypes.number.isRequired,
  withStickyName: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

const GeneralMaterial = ({
                           mh,
                           deleteMaterial,
                           showLoadingColumn,
                           dropRef,
                           dragRef,
                           withStickyName,
                           displayYieldField,
                           showComponents,
                           setShowComponents,
                           mixtureComponentsLoading,
                           isDragging, isOver, canDrop
                         }) => {
  const { material, reaction, materialGroup, isSbmm } = mh;

  const toggleComponentsAccordion = () => {
      const nextOpen = !showComponents;
      try {
        const key = accordionStorageKey(material?.id);
        if (key) {
          window.localStorage.setItem(key, nextOpen ? 'true' : 'false');
        }
      } catch (e) { /* ignore storage errors */
      }
      setShowComponents(nextOpen);
  };

  const metricPrefixes = ['m', 'n', 'u'];
  let metric = 'm';
  if (isSbmm) {
    metric = material.reactionSchemeMetricPrefix(material.amount_as_used_mass_unit);
  } else if (
    material.metrics
    && material.metrics.length > 2
    && metricPrefixes.indexOf(material.metrics[0]) > -1
  ) {
    metric = material.metrics[0];
  }

  const isMixture = material.isMixture && material.isMixture();
  // Always get fresh components from material, syncing with state
  const existingComponents = Array.isArray(material.components) ? material.components : [];
  const currentComponents = existingComponents.map((comp) => (
    comp instanceof ComponentModel
      ? comp
      : ComponentModel.deserializeData(comp)
  ));
  const mixtureComponents = currentComponents;
  const hasComponents = mixtureComponents && mixtureComponents.length > 0;

  const materialRow = (
    <div ref={dropRef} className={rowClassNames({ isDragging, isOver, canDrop })}>
      <WrapperDragHandle dragRef={dragRef} reaction={reaction}/>
      <MaterialNameWithIupac
        mh={mh}
        index={mh.index}
        withStickyName={withStickyName}
      />
      <div className="d-flex flex-column gap-1 py-1">
        {/* Flex container with flex-column because products can display extra rows */}
        <div className="d-flex gap-2 align-items-start">
          <MaterialRef mh={mh}/>
          <SwitchTargetReal mh={mh}/>
          {isSbmm ? (
            <div className="reaction-material__coefficient-data"/>
          ) : (
            <CoefficientField mh={mh}/>
          )}
          <div className="reaction-material__amount-data">
            <MassField mh={mh} metric={metric} metricPrefixes={metricPrefixes}/>
            <MaterialVolume mh={mh} className={'reaction-material__volume-data'}/>
            <MaterialAmountMol mh={mh}/>
          </div>
          {isSbmm ? (
            <div className="reaction-material__molar-mass-data">
              <MaterialActivity mh={mh}/>
            </div>
          ) : (
            <div className="reaction-material__molar-mass-data">
              <OverlayTrigger
                overlay={<Tooltip id="molar-weight-details">{mh.molarWeightValue()}</Tooltip>}
              >
                <span>{mh.molarWeightValue(true)}</span>
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
          <MaterialLoading mh={mh} showLoadingColumn={showLoadingColumn}/>
          <MaterialConcentration mh={mh}/>
          <EquivalentOrYield mh={mh} displayYieldField={displayYieldField}/>
          <div className="reaction-material__delete-data">
            <DeleteButton
              disabled={!permitOn(reaction)}
              onClick={() => deleteMaterial(material)}
            />
          </div>
        </div>
        {materialGroup === 'products' && (
          <>
            {material.gas_type === 'gas' && reaction.gaseous && <GaseousProductRow mh={mh}/>}
            {material.adjusted_loading && material.error_mass && <MaterialCalculations material={material}/>}
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
                    components={mixtureComponents}
                    solvents={material.solvent}
                    sampleId={material.id}
                    onComponentReferenceChange={mh.handler.componentReferenceChange}
                    onComponentMetricsChange={mh.handler.componentMetricsChange}
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

GeneralMaterial.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool.isRequired,
  dragRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  dropRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  index:  PropTypes.number.isRequired,
  withStickyName: PropTypes.bool.isRequired,
  displayYieldField: PropTypes.bool.isRequired,
  showComponents: PropTypes.bool.isRequired,
  setShowComponents: PropTypes.func.isRequired,
  mixtureComponentsLoading: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

const Material = ({
                    variations,
                    reaction,
                    material,
                    materialGroup,
                    deleteMaterial,
                    onChange,
                    showLoadingColumn,
                    index,
                    lockEquivColumn = false,
                    displayYieldField = false,
                    dragRef,
                    dropRef,
                    isOver = false,
                    canDrop = false,
                    isDragging = false,
                    withStickyName = false
}) => {

  // Determine initial field based on data
  const initialField = !isEmpty(material.weight_percentage)
    ? 'weight percentage'
    : 'molar mass';

  const [showComponents, setShowComponents] = useState(restoreAccordionState(material));
  const [mixtureComponents, setMixtureComponents] = useState([]);
  const [mixtureComponentsLoading, setMixtureComponentsLoading] = useState(true);
  const [fieldToShow, setFieldToShow] = useState(initialField);
  const prevMaterialId = useRef(material.id);

  const mh = useMemo(() => new MaterialHandler(
    {
      index,
      variations,
      material,
      reaction,
      materialGroup,
      onChange,
      setFieldToShow,
      fieldToShow,
      mixtureComponents,
      setMixtureComponents: (a,b) => {
        setMixtureComponentsLoading(false);
        setMixtureComponents(a,b);
      },
      lockEquivColumn
    }), [index, variations, material,
    reaction, materialGroup, onChange,
    fieldToShow, mixtureComponents, lockEquivColumn]);

  // eslint-disable-next-line class-methods-use-this

  const fetchMixtureComponentsIfNeeded = () => {
    mh.fetchMixtureComponentsIfNeeded();
  };

  useEffect(() => {
    fetchMixtureComponentsIfNeeded();
  }, []);

  useEffect(() => {
    if (prevMaterialId.current !== material.id) {
      // Update isSbmm when material changes
      mh.updateSbmm();

      if (material?.isMixture?.()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMixtureComponentsIfNeeded();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowComponents(restoreAccordionState(material));
      }

      prevMaterialId.current = material.id;
    }
  }, [material?.id]);

  const sp = materialGroup === 'solvents' || materialGroup === 'purification_solvents';
  if (sp) {
      return <SolventMaterial
        mh={mh}
        deleteMaterial={deleteMaterial}
        dropRef={dropRef}
        dragRef={dragRef}
        index={index}
        withStickyName={withStickyName}
        isDragging={isDragging}
        isOver={isOver}
        canDrop={canDrop}
      />;
  }
  return <GeneralMaterial
            mh={mh}
            deleteMaterial={deleteMaterial}
            showLoadingColumn={showLoadingColumn}
            dropRef={dropRef}
            dragRef={dragRef}
            index={index}
            withStickyName={withStickyName}
            displayYieldField={displayYieldField}
            showComponents={showComponents}
            setShowComponents={setShowComponents}
            mixtureComponentsLoading={mixtureComponentsLoading}
            isDragging={isDragging}
            isOver={isOver}
            canDrop={canDrop}
  />;
};

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
  withStickyName: PropTypes.bool,
  variations: PropTypes.arrayOf(PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired
};

Material.defaultProps = {
  lockEquivColumn: false,
  displayYieldField: false,
  isDragging: false,
  canDrop: false,
  isOver: false,
  withStickyName: false
};
