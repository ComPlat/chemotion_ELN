# frozen_string_literal: true

# Structured audit log for LLM task executions.
#
# Writes a structured log entry for every LLM task invocation. The interface
# is intentionally simple so it can be backed by a database table later
# (SF-05 or similar) without callers needing to change.
#
# Current backend: Rails.logger (tagged, structured JSON-like lines)
#
# Usage:
#   LlmAuditLogger.log(
#     user:       current_user,
#     task:       'sds_extraction',
#     resolution: resolution,       # LlmProviderResolver::LlmResolution or nil
#     success:    true,
#   )
#
#   LlmAuditLogger.log(
#     user:       current_user,
#     task:       'nmr_structuring',
#     resolution: nil,
#     success:    false,
#     error:      e,
#   )
#
class LlmAuditLogger
  # @param user       [User, nil]
  # @param task       [String]
  # @param resolution [LlmProviderResolver::LlmResolution, nil]
  # @param success    [Boolean]
  # @param error      [Exception, nil]
  def self.log(user:, task:, resolution:, success:, error: nil)
    entry = build_entry(user: user, task: task, resolution: resolution,
                        success: success, error: error)

    if success
      Rails.logger.info("[LlmAudit] #{entry.to_json}")
    else
      Rails.logger.error("[LlmAudit] #{entry.to_json}")
    end
  rescue StandardError => logging_error
    # Audit logging must never raise — swallow errors silently
    Rails.logger.warn("[LlmAudit] Failed to write audit entry: #{logging_error.message}")
  end

  private_class_method def self.build_entry(user:, task:, resolution:, success:, error:)
    entry = {
      timestamp:     Time.current.iso8601,
      task:          task.to_s,
      user_id:       user&.id,
      user_login:    user&.name_abbreviation,
      success:       success,
    }

    if resolution
      entry[:provider_id]   = resolution.provider&.id
      entry[:provider_name] = resolution.provider&.name
      entry[:model]         = resolution.model
      entry[:base_url]      = sanitize_url(resolution.base_url)
    end

    entry[:error_class]   = error.class.name if error
    entry[:error_message] = error.message.to_s[0, 300] if error

    entry
  end

  # Strip credentials from base_url before logging
  private_class_method def self.sanitize_url(url)
    return nil if url.blank?

    parsed = URI.parse(url.to_s)
    parsed.password = nil
    parsed.user     = nil
    parsed.to_s
  rescue URI::InvalidURIError
    nil
  end
end
