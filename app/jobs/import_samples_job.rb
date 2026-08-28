# frozen_string_literal: true

class ImportSamplesJob < ApplicationJob
  include ActiveJob::Status

  queue_as :import_samples

  after_perform :notify_user

  # How long a started-attempt marker is kept.
  ATTEMPT_MARKER_TTL = 1.day

  def perform(params)
    @user_id = params[:user_id]
    @collection_id = params[:collection_id]

    return @result = previous_attempt_died_result if previous_attempt_died?

    record_attempt_start
    file_format = File.extname(params[:attachment]&.filename).downcase

    @result = case file_format
              when '.xlsx', '.csv' then import_spreadsheet(params)
              when '.sdf', '.mol' then import_sdf(params)
              else { message: "Unsupported format: #{file_format}" }
              end
  rescue StandardError => e
    Delayed::Worker.logger.error e
    @result ||= {
      status: 'invalid',
      message: "Error while parsing the file: #{e.message}",
      error: e.message,
      data: [],
    }
  ensure
    # Reached on success and on any Ruby-level error -- both of which report to the user and let
    # Delayed Job record the outcome. It is deliberately NOT reached when the process is killed
    # outright, which is exactly when the marker must survive.
    clear_attempt_marker
  end

  def max_attempts
    1
  end

  private

  def import_spreadsheet(params)
    Import::ImportSamples.new(
      params[:attachment],
      @collection_id,
      @user_id,
      params[:attachment].filename,
      params[:import_type],
    ).process
  end

  def import_sdf(params)
    sdf_import = Import::ImportSdf.new(
      collection_id: @collection_id,
      current_user_id: @user_id,
      attachment: params[:attachment],
      import_type: params[:import_type],
    )
    sdf_import.import_from_file
    { message: sdf_import.message, status: sdf_status(sdf_import) }
  end

  # ImportSdf reports only 'ok', 'warning', 'invalid'. Without a status here every SDF import -- successful or not
  # -- notified as 'info' and never auto-dismissed. A partial import is neither of the two: it has rows
  # it could not process, and has to stay on screen as a warning.
  def sdf_status(sdf_import)
    return 'invalid' unless sdf_import.status == 'ok'
    # A structureless record is the same kind of outcome: it worked, but not as asked.
    return 'warning' if sdf_import.error_messages.present? || sdf_import.unprocessable_samples.present? ||
                        sdf_import.decoupled_records.present?

    'ok'
  end

  # When this job is killed outright (OOM, an operator
  # SIGKILL, a node eviction, or an uncaught C++ exception aborting the process from a native
  # structure toolkit) nothing rescuable happens, so `attempts` is never incremented and
  # `max_attempts` never applies.
  #
  # Recording that an attempt began, before any work, breaks that loop. A second entry for the same
  # job_id means the first attempt died without finishing, so stop and tell the user rather than
  # silently starting over -- which also matters because rows already committed by the dead attempt
  # would be imported a second time.
  #
  # Gaps are worth knowing. The marker lives in
  # <app>/tmp/cache on the worker's own filesystem, so it does NOT survive the container being
  # recreated, and it is invisible to a *different* worker container. It also expires after
  # ATTEMPT_MARKER_TTL, and #previous_attempt_died? fails open. In any of those cases a retry does
  # restart from the first row and re-imports whatever the dead attempt had already committed.
  def previous_attempt_died?
    attempt_marker_store.read(attempt_marker_key).present?
  rescue StandardError => e
    # Fail open. A marker that cannot be read must never block a legitimate import.
    Delayed::Worker.logger.error e
    false
  end

  def record_attempt_start
    attempt_marker_store.write(
      attempt_marker_key,
      Time.current.utc.iso8601,
      expires_in: ATTEMPT_MARKER_TTL,
    )
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  def clear_attempt_marker
    attempt_marker_store.delete(attempt_marker_key)
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  # ActiveJob::Status is already configured with a disk-backed store
  # (config/initializers/activejob-status.rb), so the marker survives a process restart without
  # needing a migration. It is per-container, which is the right scope: the re-reservation this
  # guards against only happens when the restarted worker has the same name.
  def attempt_marker_store
    ActiveJob::Status.store
  end

  def attempt_marker_key
    "import_samples_job:attempt:#{job_id}"
  end

  def previous_attempt_died_result
    {
      status: 'invalid',
      error: 'previous attempt terminated unexpectedly',
      message: 'The previous import of this file stopped unexpectedly because the worker process was ' \
               'terminated. It has not been retried automatically: rows that the stopped attempt had ' \
               'already saved would be imported twice. Please check the collection for partially ' \
               'imported samples, then upload the new modified file again that contains the rows yet to be imported.',
      data: [],
    }
  end

  def notify_user
    result = @result.is_a?(Hash) ? @result : {}
    Message.create_msg_notification(
      channel_subject: Channel::IMPORT_SAMPLES_NOTIFICATION,
      message_from: @user_id,
      message_to: [@user_id],
      data_args: { message: result[:message] },
      collection_id: @collection_id,
      level: notification_level(result[:status]),
      # A partial or failed import needs to stay on screen
      autoDismiss: result[:status] == 'ok' ? 10 : 0,
      **report_link(result),
    )
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  # A link straight to the import report, which also sits in the user's Inbox. The notification
  # renders any url/urlTitle pair it is given, and the attachment endpoint authorises an unlinked
  # inbox attachment for the user it was created for -- so no extra route or permission is involved.
  def report_link(result)
    return {} if result[:report_attachment_id].blank?

    {
      url: "#{Rails.application.config.root_url}/api/v1/attachments/#{result[:report_attachment_id]}",
      urlTitle: "Download #{result[:report_filename]}",
      # Tells the notification handler to refresh the Inbox, so the report appears there when the
      # notification does instead of only after the next manual reload.
      report_attachment_id: result[:report_attachment_id],
    }
  end

  def notification_level(status)
    case status
    when 'ok' then 'success'
    when 'warning' then 'warning'
    when 'invalid' then 'error'
    else 'info'
    end
  end
end
