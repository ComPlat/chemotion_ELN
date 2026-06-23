// Pure helpers for the reaction-variations statistics summary.
//
// Kept free of React/model imports so they can be unit-tested in isolation
// (importing the summary component would pull in the Reaction model and its
// heavy dependency chain). See ReactionVariationsSummary.js for the rendering.

export const STATISTICAL_ANALYSIS_NAME = 'Statistical Analysis';
export const SUMMARY_FILENAME = 'variations_summary.json';

// Walk a reaction container tree and group the OpenStats results by analysis:
// one entry per "Statistical Analysis" analysis, with its dataset attachments
// split into the summary json and the .png plots. Groups with neither are dropped.
export function collectSummaryGroups(container) {
  if (!container) {
    return [];
  }
  const analysesContainers = (container.children ?? [])
    .filter((child) => child.container_type === 'analyses');
  const analyses = analysesContainers
    .flatMap((analysesContainer) => analysesContainer.children ?? [])
    .filter((child) => child.container_type === 'analysis' && child.name === STATISTICAL_ANALYSIS_NAME);
  return analyses
    .map((analysis) => {
      const allAttachments = (analysis.children ?? [])
        .filter((child) => child.container_type === 'dataset')
        .flatMap((dataset) => dataset.attachments ?? []);
      const attachments = allAttachments.filter((attachment) => attachment.filename === SUMMARY_FILENAME);
      const plots = allAttachments.filter((attachment) => attachment.filename.endsWith('.png'));
      return {
        analysisId: analysis.id, analysisName: analysis.name, attachments, plots,
      };
    })
    .filter((group) => group.attachments.length > 0 || group.plots.length > 0);
}

// Order-preserving union of all keys across the given rows.
export function getColumns(items) {
  const columns = [];
  items.forEach((row) => Object.keys(row).forEach((key) => {
    if (!columns.includes(key)) {
      columns.push(key);
    }
  }));
  return columns;
}

// Render a cell value, showing a dash for blank values.
export function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}
