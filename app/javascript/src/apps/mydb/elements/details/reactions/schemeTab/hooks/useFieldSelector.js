import { useState, useEffect } from 'react';

const isEmpty = (v) => (v === null || v === undefined || Number.isNaN(v) || v === 0);

/**
 * Hook to manage the equivalent/weight-percentage field selector state for a material.
 *
 * @param {Sample} material - The material sample
 * @returns {{ fieldToShow, setFieldToShow }}
 */
export default function useFieldSelector(material) {
  const [fieldToShow, setFieldToShow] = useState('molar mass');

  useEffect(() => {
    if (!isEmpty(material.weight_percentage)) {
      setFieldToShow('weight percentage');
    } else {
      setFieldToShow('molar mass');
    }
  }, [material?.id]);

  return { fieldToShow, setFieldToShow };
}
