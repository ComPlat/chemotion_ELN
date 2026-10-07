# frozen_string_literal: true

# Background job for LLM-based SDS (Safety Data Sheet) extraction.
#
# The PDF is converted to text locally and passed to LlmTaskRunner, which picks the
# provider and model through LlmProviderResolver: the task's own override, then the
# user's default provider, then the institution's.
#
# Usage:
#   ExtractSdsJob.perform_later(
#     sample_id: chemical.sample_id,
#     user_id: current_user.id,
#     sheet_path: '/safety_sheets/merck/33009_0123456789abcdef.pdf', # optional
#   )
#
# rubocop:disable Metrics/ClassLength -- this job owns the whole SDS pipeline end
# to end: locating the stored PDF, running the extraction, mapping H/P/EUH codes
# against the reference tables, writing the result back onto the chemical, and
# reporting through the notification channel. Splitting it purely for line count
# would scatter one sequence across several files.
class ExtractSdsJob < ApplicationJob
  include ActiveJob::Status

  queue_as :extract_sds

  # Set high priority for this job
  def self.default_priority
    -10 # Higher priority (lower number means higher priority in Delayed::Job)
  end

  after_perform do
    # Only the run that owns the sample's extraction reports; see #superseded?.
    next if superseded?

    # Persist a failure marker so the frontend polling can stop the spinner and
    # surface the error promptly, instead of waiting out the 3-minute poll window.
    persist_extraction_failure if @notification_level == 'error'

    channel = Channel.find_by(subject: Channel::SYSTEM_NOTIFICATION)
    channel ||= Channel.create!(subject: Channel::SYSTEM_NOTIFICATION, channel_type: 9)

    content = {
      'channel_id' => channel.id,
      'data' => @notification_message,
      'level' => @notification_level || 'info',
      'autoDismiss' => 5,
    }
    if @notification_action.present?
      content['action'] = @notification_action
      content['sample_id'] = @sample_id
    end

    Message.create_msg_notification(
      message_content: content,
      message_from: @user_id,
      message_to: [@user_id],
    )
  rescue StandardError => e
    Delayed::Worker.logger.error "ExtractSdsJob notification error: #{e.message}"
  end

  NO_PROVIDER_MESSAGE = 'SDS extraction failed: no LLM provider is configured. ' \
                        'Set one up in Profile → AI Settings, or ask your admin ' \
                        'to configure the institution provider.'

  # Vendor product-info keys that may carry a locally stored SDS.
  VENDOR_INFO_KEYS = %w[merckProductInfo alfaProductInfo].freeze

  # The only directory under public/ an SDS may be read from.
  SAFETY_SHEET_DIR = 'safety_sheets'

  def perform(sample_id:, user_id:, sheet_path: nil)
    self.priority = self.class.default_priority
    start_notification(sample_id, user_id)

    chemical = Chemical.find_by(sample_id: sample_id)
    return fail_with("SDS extraction failed: no chemical record for sample #{sample_id}.") unless chemical

    file_path = sds_file_for(chemical, sheet_path)
    return fail_with('SDS extraction failed: no SDS file found for this chemical.') unless file_path

    # A second execution of this same job is doing the work already; bail out
    # before spending an LLM call on it.
    return unless claim_extraction(chemical)

    user = User.find_by(id: user_id)
    return fail_with(NO_PROVIDER_MESSAGE) unless user && provider_path_available?(user)

    run_with_provider(chemical, user, file_path)
  rescue StandardError => e
    handle_perform_error(e)
  end

  def max_attempts
    1
  end

  private

  # Failure is the default state: only #run_with_provider, once the record is
  # written, may report that the extraction completed.
  def start_notification(sample_id, user_id)
    @sample_id            = sample_id
    @user_id              = user_id
    @run_token            = SecureRandom.hex(8)
    @claimed              = false
    @duplicate            = false
    @notification_message = 'SDS extraction did not complete.'
    @notification_level   = 'error'
    @notification_action  = nil
  end

  # Stamp this execution on the chemical, and answer whether it may proceed: one
  # conditional UPDATE, so of two executions of one job row exactly one claims it.
  # The same statement drops any earlier failure marker. Cf. ChemicalTab's polling.
  def claim_extraction(chemical)
    claim = { 'job_id' => job_id, 'token' => @run_token, 'started_at' => Time.current.iso8601 }
    # rubocop:disable Rails/SkipsModelValidations -- deliberate: the claim must be
    # one atomic statement, and fires no validations or callbacks.
    rows = Chemical.where(id: chemical.id)
                   .where("COALESCE(chemical_data -> 0 -> 'extraction_run' ->> 'job_id', '') <> ?", job_id.to_s)
                   .update_all(["chemical_data = jsonb_set(chemical_data #- '{0,extraction_error}', " \
                                "'{0,extraction_run}', ?::jsonb, true)", claim.to_json])
    # rubocop:enable Rails/SkipsModelValidations
    @claimed = rows.positive?
    @duplicate = !@claimed
    Rails.logger.warn("[ExtractSdsJob] sample #{@sample_id}: job #{job_id} is already running; skipping.") if @duplicate
    @claimed
  rescue StandardError => e
    # An unstamped run still runs and reports: a lost stamp must not cost the user
    # their extraction.
    Delayed::Worker.logger.error "ExtractSdsJob claim error: #{e.message}"
    true
  end

  # Whether another execution owns this sample's extraction — a duplicate of this
  # job, or a newer extraction started while this one was running.
  def superseded?
    return true if @duplicate
    return false unless @claimed

    token = stored_run_token
    return false if token.blank? || token == @run_token

    Rails.logger.warn(
      "[ExtractSdsJob] sample #{@sample_id}: a newer extraction is in charge; " \
      "suppressing this run's #{@notification_level} notification.",
    )
    true
  rescue StandardError => e
    Delayed::Worker.logger.error "ExtractSdsJob supersede-check error: #{e.message}"
    false
  end

  def stored_run_token
    chemical = Chemical.find_by(sample_id: @sample_id)
    data = chemical&.chemical_data
    return nil unless data.is_a?(Array) && data[0].is_a?(Hash)

    data[0].dig('extraction_run', 'token')
  end

  # Record a failure for after_perform to surface, and return nil so callers can
  # `return fail_with(...)` as a guard.
  def fail_with(message)
    @notification_message = message
    @notification_level   = 'error'
    nil
  end

  # Every failure reaches the user as the same notification; only the log line
  # differs by error class.
  def handle_perform_error(error)
    case error
    when Errors::LlmNotConfiguredError, Errors::LlmProviderError
      Rails.logger.error "ExtractSdsJob LLM error: #{error.class} - #{error.message}"
    when SdsPdfTextExtractor::ExtractionError
      Rails.logger.error "ExtractSdsJob PDF extraction error: #{error.message}"
    else
      Rails.logger.error "ExtractSdsJob error: #{error.class} - #{error.message}"
      Rails.logger.error error.backtrace&.first(5)&.join("\n")
    end

    fail_with("SDS extraction error: #{error.message}#{attempted_model_note}")
  end

  # Names the model and provider that refused, so a misrouted task is visible in the notification.
  def attempted_model_note
    resolution = @runner&.resolution
    return '' unless resolution&.model

    provider = resolution.provider&.name
    " (model #{resolution.model}#{" on #{provider}" if provider})"
  end

  # Returns true when a user has a working LLM provider configured for SDS extraction.
  def provider_path_available?(user)
    LlmProviderResolver.resolve(user: user, task_name: 'sds_extraction')
    true
  rescue Errors::LlmNotConfiguredError
    false
  end

  # SF-05: extract text from the SDS PDF and run it through LlmTaskRunner.
  #
  # LlmTaskRunner resolves the provider via LlmProviderResolver in this order:
  #   1. User's task-specific model for 'sds_extraction' (Profile → AI Settings → Task table)
  #   2. User's default provider
  #   3. Global admin provider
  def run_with_provider(chemical, user, file_path)
    progress.progress = 10
    status[:stage] = 'extracting_text'
    pdf_text = SdsPdfTextExtractor.extract(file_path)

    progress.progress = 20
    status[:stage] = 'calling_llm'
    # task_name: 'sds_extraction' is passed so LlmProviderResolver picks the model
    # the user assigned to this specific task in their AI Settings profile.
    runner = @runner = LlmTaskRunner.new(
      task_name: 'sds_extraction',
      user: user,
      context: pdf_text,
    )
    extraction_result = runner.run

    progress.progress = 90
    status[:stage] = 'updating_record'
    update_chemical_data(
      chemical,
      extraction_result,
      model_used: runner.model_used,
      requested_model: (runner.requested_model if runner.fell_back?),
    )

    @notification_message = "SDS extraction completed. Safety data has been updated for sample #{@sample_id}."
    @notification_level   = 'info'
    @notification_action  = 'ElementActions.fetchSampleById'
  end

  # The named sheet, else the one chemical_data records last.
  def sds_file_for(chemical, sheet_path)
    sheet_path ? existing_public_file(sheet_path) : resolve_sds_path(chemical)
  end

  # Find the SDS file on disk from chemical_data. Two places record one:
  # safetySheetPath (written by save_safety_datasheet / save_manual_sds), and a
  # vendor's sdsLink when it points at a local copy rather than the vendor's site.
  def resolve_sds_path(chemical)
    data = chemical.chemical_data
    return nil unless data.is_a?(Array) && data[0].is_a?(Hash)

    sds_path_from_safety_sheet(data[0]) || sds_path_from_vendor_info(data[0])
  end

  def sds_path_from_safety_sheet(data)
    entries = data['safetySheetPath']
    return nil unless entries.is_a?(Array) && entries.any?

    existing_public_file(safety_sheet_relative_path(entries.last))
  end

  # Entries are hashes like
  #   { "295302_37d4e21b_link" => "/safety_sheets/merck/295302_web_37d4e21b.pdf" }
  # but older records store the path as a bare string.
  def safety_sheet_relative_path(entry)
    return entry unless entry.is_a?(Hash)

    entry.values.find { |v| v.is_a?(String) && v.include?('/safety_sheets/') }
  end

  def sds_path_from_vendor_info(data)
    VENDOR_INFO_KEYS.each do |key|
      info = data[key]
      next unless info.is_a?(Hash)

      link = info['sdsLink']
      next if link.blank? || link.start_with?('http')

      path = existing_public_file(link)
      return path if path
    end

    nil
  end

  # Absolute path for a stored relative path, or nil if it is gone.
  # The path comes from user-writable chemical_data, so anything resolving
  # outside public/safety_sheets is refused rather than read.
  def existing_public_file(relative_path)
    return nil if relative_path.blank?

    root     = Rails.public_path.join(SAFETY_SHEET_DIR).to_s
    abs_path = File.expand_path(relative_path.sub(%r{^/}, ''), Rails.public_path.to_s)
    return nil unless abs_path.start_with?("#{root}/")

    abs_path if File.exist?(abs_path)
  end

  # Merge LLM extraction result into chemical_data.
  #
  # @param model_used      [String, nil] the LLM model that actually served the task
  #   (LlmTaskRunner#model_used), stored so the UI can show which model was used.
  # @param requested_model [String, nil] the task-specific model that was requested
  #   but was unavailable, when the runner fell back to the default model. nil when
  #   no fallback happened; lets the UI show "requested X, fell back to <model>".
  def update_chemical_data(chemical, extraction_result, model_used: nil, requested_model: nil)
    # Re-read first: the record may have moved on while the LLM was answering,
    # and merging onto a stale copy would drop that work.
    chemical.reload
    data  = chemical.chemical_data.deep_dup
    entry = data[0] || {}

    # Safety phrases (H/P/EUH codes) from extracted data
    entry['safetyPhrases'] = (entry['safetyPhrases'] || {}).merge(build_safety_phrases(extraction_result))

    # Merge physical properties if present
    properties = extraction_result['properties']
    entry['extractedProperties'] = properties if properties.is_a?(Hash) && properties.any?

    entry['aiExtraction'] = extraction_metadata(extraction_result, model_used, requested_model)
    entry.delete('extraction_error') # clear any prior failure marker on success

    data[0] = entry
    chemical.update!(chemical_data: data)
  end

  # Raw extraction metadata — used by the frontend AI result modal.
  def extraction_metadata(extraction_result, model_used, requested_model)
    metadata = {
      'extracted_at' => Time.current.iso8601,
      'model' => model_used,
      'requested_model' => requested_model,
      'chemical_name' => extraction_result['chemical_name'],
      'signal_word' => extraction_result['signal_word'],
    }

    if extraction_result['is_mixture']
      metadata['is_mixture'] = true
      # Component list for mixtures (each entry has name, cas_number, concentration)
      components = present_array(extraction_result, 'mixture_components')
      metadata['mixture_components'] = components if components
    else
      metadata['cas_number'] = extraction_result['cas_number']
      metadata['molecular_formula'] = extraction_result['molecular_formula']
    end

    metadata.compact
  end

  # Write a failure marker into chemical_data[0] so the frontend polling detects
  # the error (via its changed +failed_at+) and resets the "Extracting…" button.
  def persist_extraction_failure
    return unless @sample_id

    chemical = Chemical.find_by(sample_id: @sample_id)
    return unless chemical&.chemical_data.is_a?(Array) && chemical.chemical_data[0].is_a?(Hash)

    data = chemical.chemical_data.deep_dup
    data[0]['extraction_error'] = {
      'message' => @notification_message,
      'failed_at' => Time.current.iso8601,
    }
    # rubocop:disable Rails/SkipsModelValidations -- deliberate: this writes only a
    # failure marker the frontend polls for, and must not fire validations or
    # callbacks on a chemical whose extraction just failed.
    chemical.update_columns(chemical_data: data)
    # rubocop:enable Rails/SkipsModelValidations
  rescue StandardError => e
    Delayed::Worker.logger.error "ExtractSdsJob failure-marker error: #{e.message}"
  end

  # Convert flat code arrays to Chemotion's hash format using reference data.
  def build_safety_phrases(extraction_result)
    phrases = hazard_statement_phrases(extraction_result)

    p_codes = present_array(extraction_result, 'precautionary_statements')
    phrases['p_statements'] = map_codes_to_descriptions(p_codes, precautionary_phrases_lookup) if p_codes

    ghs_codes = present_array(extraction_result, 'ghs_codes')
    phrases['pictograms'] = Chemotion::ChemicalsService.construct_pictograms(ghs_codes) if ghs_codes

    phrases
  end

  # GHS hazard statements and the European supplemental ones (EUH-XXX) are looked
  # up in the same table and share the one 'h_statements' bucket.
  def hazard_statement_phrases(extraction_result)
    h_codes  = present_array(extraction_result, 'hazard_statements')
    eu_codes = present_array(extraction_result, 'eu_h_statements')
    return {} unless h_codes || eu_codes

    statements = {}
    statements.merge!(map_codes_to_descriptions(h_codes, hazard_phrases_lookup)) if h_codes
    statements.merge!(map_codes_to_descriptions(eu_codes, hazard_phrases_lookup)) if eu_codes
    { 'h_statements' => statements }
  end

  # The value at +key+ when the model returned a non-empty Array there, else nil.
  def present_array(extraction_result, key)
    value = extraction_result[key]
    value if value.is_a?(Array) && value.any?
  end

  # Map an array of codes like ["H225", "H319"] to {"H225" => " description", ...}
  def map_codes_to_descriptions(codes, lookup)
    result = {}
    codes.each do |code|
      description = lookup[code]
      result[code] = " #{description}" if description
    end
    result
  end

  def hazard_phrases_lookup
    @hazard_phrases_lookup ||= JSON.parse(Rails.public_path.join('json', 'hazardPhrases.json').read)
  end

  def precautionary_phrases_lookup
    @precautionary_phrases_lookup ||= JSON.parse(Rails.public_path.join('json', 'precautionaryPhrases.json').read)
  end
end
# rubocop:enable Metrics/ClassLength
