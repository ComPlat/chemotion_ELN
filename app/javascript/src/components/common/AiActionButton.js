import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * Shared "run this with AI" control used throughout the ELN (SDS extraction,
 * spectral data structuring, and any future LLM task trigger), so every AI
 * action button looks and behaves the same everywhere.
 *
 * Renders as a two-part input-group-style control: the run action (left) and
 * a paired "view last result" icon (right, disabled until a result exists).
 * There is deliberately no client-side choice between running inline or in
 * the background — that is decided entirely by the task's `execution_mode`
 * in its config/llm_tasks/*.yml (an ELN installation setting), not by the
 * user clicking something different. Styling lives in
 * app/assets/stylesheets/components/AiActionButton.scss (.ai-action-btn /
 * .ai-action-view-btn) so it is themeable in one place.
 *
 * The AI marker is a sparkle glyph (✨) rather than a magic-wand icon — the
 * common visual shorthand for "AI-generated action" across modern UIs. The
 * view-result icon is a file/document glyph (matches the original SDS
 * "view AI result" affordance) — deliberately not an info icon.
 */
const AiActionButton = ({
  label, loadingLabel, loading, disabled, onRun, runTooltip,
  hasResult, onViewResult, viewResultTooltip, viewResultDisabledTooltip,
}) => (
  <span className="d-inline-flex">
    <OverlayTrigger placement="top" overlay={<Tooltip id="ai-action-run-tooltip">{runTooltip}</Tooltip>}>
      <span className="d-inline-block">
        <Button
          className={`ai-action-btn${loading ? ' ai-action-btn--busy' : ''}`}
          size="sm"
          disabled={disabled || loading}
          onClick={onRun}
          style={disabled ? { pointerEvents: 'none' } : undefined}
        >
          <span className="ai-sparkle-icon me-2" aria-hidden="true">
            {loading ? <i className="fa fa-spinner fa-pulse" /> : '✨'}
          </span>
          {/*
            Both labels occupy the same grid cell, so the button is always as wide as
            the longer of the two and cannot resize the moment a run starts — which
            would otherwise shove the surrounding row around (e.g. "JSON" →
            "Structuring…"). The inactive one is hidden, not unmounted: visibility
            keeps it out of the accessibility tree while still reserving its width.
          */}
          <span className="ai-action-btn__labels">
            <span className={`ai-action-btn__label${loading ? ' ai-action-btn__label--hidden' : ''}`}>
              {label}
            </span>
            <span className={`ai-action-btn__label${loading ? '' : ' ai-action-btn__label--hidden'}`}>
              {loadingLabel}
            </span>
          </span>
        </Button>
      </span>
    </OverlayTrigger>
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="ai-action-view-tooltip">
          {hasResult ? viewResultTooltip : viewResultDisabledTooltip}
        </Tooltip>
      )}
    >
      <Button className="ai-action-view-btn" size="sm" onClick={onViewResult} disabled={!hasResult}>
        <i className="fa fa-file-text-o" />
      </Button>
    </OverlayTrigger>
  </span>
);

AiActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  loadingLabel: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  onRun: PropTypes.func.isRequired,
  runTooltip: PropTypes.node,
  hasResult: PropTypes.bool,
  onViewResult: PropTypes.func.isRequired,
  viewResultTooltip: PropTypes.node,
  viewResultDisabledTooltip: PropTypes.node,
};

AiActionButton.defaultProps = {
  loadingLabel: 'Working…',
  loading: false,
  disabled: false,
  runTooltip: 'Run this task using AI (LLM-based). Results are generated automatically '
    + 'and may contain inaccuracies — please review carefully.',
  hasResult: false,
  viewResultTooltip: 'Click to view the AI result',
  viewResultDisabledTooltip: 'Run the AI task first to view results',
};

export default AiActionButton;
