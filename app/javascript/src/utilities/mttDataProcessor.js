export function isMttMeasurement(measurement) {
  return Boolean(measurement.metadata && measurement.metadata.analysis_type === 'mtt_output');
}

export function flattenAnalysesFromOutputs(outputs) {
  const allAnalyses = [];

  if (!outputs || outputs.length === 0) {
    return allAnalyses;
  }

  outputs.forEach((output) => {
    if (!output.output_data || !output.output_data.Output) {
      return;
    }

    output.output_data.Output.forEach((outputGroup, groupIdx) => {
      // New structure: Output[].items[]
      if (outputGroup.items && Array.isArray(outputGroup.items)) {
        outputGroup.items.forEach((item, itemIdx) => {
          const key = `${output.id}-${groupIdx}-${itemIdx}`;
          const sampleName = item.result?.[0]?.name || `Analysis #${itemIdx + 1}`;

          allAnalyses.push({
            key,
            dataItem: item,
            sampleName,
            outputId: output.id,
            createdAt: output.created_at
          });
        });
      } else if (outputGroup.result) {
        // Legacy structure: Output[].input[] / Output[].result[]
        const key = `${output.id}-${groupIdx}`;
        const sampleName = outputGroup.result?.[0]?.name || `Analysis #${groupIdx + 1}`;

        allAnalyses.push({
          key,
          dataItem: outputGroup,
          sampleName,
          outputId: output.id,
          createdAt: output.created_at
        });
      }
    });
  });

  return allAnalyses;
}

export function normalizeMttResult(rawResult) {
  const result = rawResult || {};
  const keys = Object.keys(result);

  // Discover the IC<n> relative keys (and their bounds) regardless of the threshold.
  const relativeKey = keys.find((k) => /^IC.*_relative$/.test(k));
  const relativeLowerKey = keys.find((k) => /^IC.*_relative_lower$/.test(k));
  const relativeHigherKey = keys.find((k) => /^IC.*_relative_higher$/.test(k));
  // pIC metric: "pIC" or "pIC50" (or any pIC<n>).
  const picKey = keys.find((k) => /^pIC\d*$/.test(k));

  const labelFromKey = (key) => key && key
    .replace(/_relative.*$/, '') // drop "_relative"/"_relative_lower"/...
    .replace(/_/g, '');          // "IC_25" -> "IC25", "IC50" -> "IC50"

  return {
    ...result,
    icLabel: labelFromKey(relativeKey) || 'IC',
    picLabel: picKey || 'pIC',
    icRelative: relativeKey ? result[relativeKey] : undefined,
    icRelativeLower: relativeLowerKey ? result[relativeLowerKey] : undefined,
    icRelativeHigher: relativeHigherKey ? result[relativeHigherKey] : undefined,
    pIc: picKey ? result[picKey] : undefined,
    unit: result.unit || ''
  };
}
