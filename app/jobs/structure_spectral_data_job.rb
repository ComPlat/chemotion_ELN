# frozen_string_literal: true

# Background job for LLM-based spectral data structuring (SF-06).
#
# This is the ASYNC counterpart to the inline /api/v1/llm/spectral/extract
# endpoint used by the "JSON" button (which awaits a synchronous response for
# the modal). This job is the "Run in background" option — the container must
# already be saved (its analysis Content is read straight from the DB), the
# result is persisted server-side, and the user is notified via the standard
# system-notification channel (mirrors ExtractSdsJob's pattern for SDS).
#
# Usage:
#   StructureSpectralDataJob.perform_later(container_id: container.id, user_id: current_user.id)
#
class StructureSpectralDataJob < ApplicationJob
  include ActiveJob::Status

  queue_as :structure_spectral_data

  def self.default_priority
    -5
  end

  after_perform do
    persist_extraction_failure if @notification_level == 'error'

    channel = Channel.find_by(subject: Channel::SYSTEM_NOTIFICATION)
    channel ||= Channel.create!(subject: Channel::SYSTEM_NOTIFICATION, channel_type: 9)

    content = {
      'channel_id' => channel.id,
      'data' => @notification_message,
      'level' => @notification_level || 'info',
      'autoDismiss' => 5,
    }

    Message.create_msg_notification(
      message_content: content,
      message_from: @user_id,
      message_to: [@user_id],
    )
  rescue StandardError => e
    Delayed::Worker.logger.error "StructureSpectralDataJob notification error: #{e.message}"
  end

  def perform(container_id:, user_id:)
    self.priority = self.class.default_priority

    @container_id       = container_id
    @user_id            = user_id
    @notification_level = 'info'

    container = Container.find_by(id: container_id)
    return fail_with("Spectral data structuring failed: container #{container_id} not found.") unless container

    user = User.find_by(id: user_id)
    return fail_with('Spectral data structuring failed: user not found.') unless user

    result = SpectralExtractionService.call(
      user:    user,
      content: container.extended_metadata&.dig('content'),
      kind:    container.extended_metadata&.dig('kind'),
    )

    persist_result(container, result)
    @notification_message = 'Spectral data structuring completed. The structured JSON is now available on the analysis.'
  rescue StandardError => e
    handle_perform_error(e)
  end

  def max_attempts
    1
  end

  private

  # Record a failure for after_perform to surface, and return nil so callers can
  # `return fail_with(...)` as a guard.
  def fail_with(message)
    @notification_message = message
    @notification_level   = 'error'
    nil
  end

  # Every failure reaches the user as the same notification; an unexpected error
  # additionally gets a backtrace in the log.
  def handle_perform_error(error)
    Rails.logger.error "StructureSpectralDataJob error: #{error.class} - #{error.message}"
    unless error.is_a?(SpectralExtractionService::Error) ||
           error.is_a?(Errors::LlmNotConfiguredError) ||
           error.is_a?(Errors::LlmProviderError)
      Rails.logger.error error.backtrace&.first(5)&.join("\n")
    end

    fail_with("Spectral data structuring failed: #{error.message}")
  end

  # Persist directly on the container (server-side write — there is no
  # frontend round trip for an async job) as a JSON string, since
  # extended_metadata is an hstore column (flat string values only).
  # ContainerEntity#extended_metadata parses it back into a Hash for the API.
  def persist_result(container, result)
    data = container.extended_metadata.deep_dup || {}
    data['ai_spectral_data'] = {
      'technique'       => result.technique,
      'technique_label' => result.technique_label,
      'nucleus'         => result.nucleus,
      'model'           => result.model,
      'requested_model' => result.requested_model,
      'result'          => result.data,
      'extracted_at'    => Time.current.iso8601,
    }.compact.to_json
    data.delete('ai_spectral_extraction_error')
    container.update!(extended_metadata: data)
  end

  # Write a failure marker so the frontend polling loop can detect the error
  # promptly, mirroring ExtractSdsJob#persist_extraction_failure.
  def persist_extraction_failure
    return unless @container_id

    container = Container.find_by(id: @container_id)
    return unless container

    data = container.extended_metadata.deep_dup || {}
    data['ai_spectral_extraction_error'] = {
      'message'   => @notification_message,
      'failed_at' => Time.current.iso8601,
    }.to_json
    # rubocop:disable Rails/SkipsModelValidations -- deliberate: this writes only a
    # failure marker the frontend polls for, and must not fire container callbacks.
    container.update_columns(extended_metadata: data)
    # rubocop:enable Rails/SkipsModelValidations
  rescue StandardError => e
    Delayed::Worker.logger.error "StructureSpectralDataJob failure-marker error: #{e.message}"
  end
end
