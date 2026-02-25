/**
 * Flattens MTT analysis data from outputs into individual analysis items.
 *
 * Supports the new OpenStats response structure (v2):
 *   Output[].items[].input[] / Output[].items[].result[]
 *
 * Also supports the legacy structure for backward compatibility:
 *   Output[].input[] / Output[].result[]
 *
 * @param {Array} outputs - Array of output objects from MTT requests
 * @returns {Array} Flattened array of analysis items with structure:
 *   {
 *     key: string,           // Unique identifier for the analysis
 *     dataItem: object,      // Analysis data (input + result)
 *     sampleName: string,    // Name of the sample
 *     outputId: number,      // ID of the parent output
 *     createdAt: string      // Creation timestamp
 *   }
 */
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
