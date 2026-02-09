/**
 * Flattens MTT analysis data from outputs into individual analysis items.
 *
 * Handles the OpenStats bug workaround where multiple samples are combined
 * into one Output item instead of separate items.
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

    output.output_data.Output.forEach((dataItem, dataIdx) => {
      // TODO: REMOVE THIS SPLIT LOGIC WHEN OPENSTATS IS FIXED
      // OpenStats currently combines multiple samples into one Output item
      // Expected: separate Output items per sample
      // Actual: one Output item with multiple results in result array

      if (dataItem.result && dataItem.result.length > 1) {
        // Split case: Multiple samples in one output
        dataItem.result.forEach((result, resultIdx) => {
          const sampleName = result.name;
          // Filter input data for this specific sample
          const sampleInput = dataItem.input?.filter(inp => inp.name === sampleName) || [];

          // Create a virtual dataItem for this sample
          const splitDataItem = {
            input: sampleInput,
            result: [result]
          };

          const key = `${output.id}-${dataIdx}-${resultIdx}`;

          allAnalyses.push({
            key,
            dataItem: splitDataItem,
            sampleName,
            outputId: output.id,
            createdAt: output.created_at
          });
        });
      } else {
        // Normal case: Single sample per output
        const key = `${output.id}-${dataIdx}`;
        const sampleName = dataItem.result?.[0]?.name || `Analysis #${dataIdx + 1}`;

        allAnalyses.push({
          key,
          dataItem,
          sampleName,
          outputId: output.id,
          createdAt: output.created_at
        });
      }
    });
  });

  return allAnalyses;
}
