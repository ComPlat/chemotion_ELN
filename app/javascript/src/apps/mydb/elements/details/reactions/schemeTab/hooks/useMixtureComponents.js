import { useState, useEffect, useCallback } from 'react';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import ComponentModel from 'src/models/Component';

const ACCORDION_STORAGE_KEY_PREFIX = 'mixture_components_accordion_open:';

function getAccordionStorageKey(materialId) {
  if (!materialId) return null;
  return `${ACCORDION_STORAGE_KEY_PREFIX}${materialId}`;
}

function readAccordionState(materialId) {
  try {
    const key = getAccordionStorageKey(materialId);
    if (!key) return false;
    return window.localStorage.getItem(key) === 'true';
  } catch (e) { return false; }
}

function writeAccordionState(materialId, isOpen) {
  try {
    const key = getAccordionStorageKey(materialId);
    if (key) { window.localStorage.setItem(key, isOpen ? 'true' : 'false'); }
  } catch (e) { /* ignore storage errors */ }
}

/**
 * Hook to manage mixture component fetching and accordion state for a material.
 *
 * @param {Sample} material - The material sample
 * @returns {{ showComponents, mixtureComponents, mixtureComponentsLoading, toggleComponentsAccordion }}
 */
export default function useMixtureComponents(material) {
  const [showComponents, setShowComponents] = useState(false);
  const [mixtureComponents, setMixtureComponents] = useState([]);
  const [mixtureComponentsLoading, setMixtureComponentsLoading] = useState(false);

  // Fetch components and restore accordion state when material changes
  useEffect(() => {
    const isMixture = material && material.isMixture && material.isMixture();

    if (!isMixture) {
      setMixtureComponents([]);
      setMixtureComponentsLoading(false);
      return;
    }

    // Restore accordion state
    setShowComponents(readAccordionState(material.id));

    const existingComponents = Array.isArray(material.components) ? material.components : [];

    if (existingComponents.length > 0) {
      const componentsList = existingComponents.map((comp) => (
        comp instanceof ComponentModel ? comp : ComponentModel.deserializeData(comp)
      ));
      setMixtureComponents(componentsList);
      setMixtureComponentsLoading(false);
    } else if (typeof material.id === 'number') {
      setMixtureComponentsLoading(true);
      ComponentsFetcher.fetchComponentsBySampleId(material.id)
        .then((components) => {
          const componentsList = components.map(ComponentModel.deserializeData);
          material.initialComponents(componentsList);
          setMixtureComponents(componentsList);
          setMixtureComponentsLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching components:', error);
          setMixtureComponentsLoading(false);
        });
    } else {
      setMixtureComponents([]);
      setMixtureComponentsLoading(false);
    }
  }, [material?.id]);

  const toggleComponentsAccordion = useCallback(() => {
    setShowComponents((prev) => {
      const nextOpen = !prev;
      writeAccordionState(material?.id, nextOpen);
      return nextOpen;
    });
  }, [material?.id]);

  return {
    showComponents,
    mixtureComponents,
    setMixtureComponents,
    mixtureComponentsLoading,
    toggleComponentsAccordion,
  };
}
