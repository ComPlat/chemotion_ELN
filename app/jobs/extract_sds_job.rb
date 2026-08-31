# frozen_string_literal: true

# Background job for LLM-based SDS (Safety Data Sheet) extraction.
#
# Extraction strategy (first available wins):
#
#   1. Provider path (SF-05) — used when the user has an LLM provider configured
#      in Profile → AI Settings.  The PDF is converted to text locally via
#      Ghostscript and then passed to LlmTaskRunner, which resolves the provider
#      and model through LlmProviderResolver using the following priority:
#        a) User's task-specific model override for 'sds_extraction'
#           (set in the "Task → Model" table in Profile → AI Settings)
#        b) User's default provider/model
#        c) Admin's global provider/model
#
#   2. Legacy path (ai4chemotion microservice) — currently disabled; the code is
#      commented out below and re-enabled in a separate commit.
#
# Usage:
#   ExtractSdsJob.perform_later(
#     sample_id: chemical.sample_id,
#     user_id: current_user.id,
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

  def perform(sample_id:, user_id:)
    self.priority = self.class.default_priority
    start_notification(sample_id, user_id)

    chemical = Chemical.find_by(sample_id: sample_id)
    return fail_with("SDS extraction failed: no chemical record for sample #{sample_id}.") unless chemical

    file_path = resolve_sds_path(chemical)
    return fail_with('SDS extraction failed: no SDS file found for this chemical.') unless file_path

    # SF-05: use the user's configured LLM provider.
    # Legacy ai4chemotion fallback (re-enabled in a separate commit):
    #   run_with_ai4chemotion(chemical, file_path, sample_id)
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

  # Assume success; every failure path below overwrites this via #fail_with.
  def start_notification(sample_id, user_id)
    @sample_id            = sample_id
    @user_id              = user_id
    @notification_message = 'SDS extraction completed successfully.'
    @notification_level   = 'info'
    @notification_action  = nil
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
  #
  # Legacy ai4chemotion branches (re-enabled in a separate commit):
  #   when Chemotion::Ai4ChemotionService::ServiceUnavailableError
  #     'SDS extraction unavailable'
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

    fail_with("SDS extraction error: #{error.message}")
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
    runner = LlmTaskRunner.new(
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
    @notification_action = 'ElementActions.fetchSampleById'
  end

  # Legacy ai4chemotion microservice path — disabled for now; re-enabled in a
  # separate commit together with lib/chemotion/ai4_chemotion_service.rb.
  #
  # # Legacy: submit the PDF to the ai4chemotion microservice and poll for result.
  # def run_with_ai4chemotion(chemical, file_path, sample_id)
  #   vendor = detect_vendor(chemical)
  #
  #   progress.progress = 5
  #   status[:stage] = 'submitting'
  #   submission = Chemotion::Ai4ChemotionService.extract_sds(
  #     file_path, sample_id: sample_id, vendor: vendor
  #   )
  #   job_id = submission['job_id']
  #
  #   result = poll_until_complete(job_id)
  #
  #   if result['status'] == 'SUCCESS' && result['result'].present?
  #     progress.progress = 90
  #     status[:stage] = 'updating_record'
  #     update_chemical_data(chemical, result['result'])
  #     @notification_message = "SDS extraction completed. Safety data has been updated for sample #{sample_id}."
  #     @notification_action = 'ElementActions.fetchSampleById'
  #   else
  #     errors = result['errors']&.join(', ') || result['message'] || 'Unknown error'
  #     @notification_message = "SDS extraction failed: #{errors}"
  #     @notification_level = 'error'
  #   end
  # end

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

  # Legacy ai4chemotion helpers — disabled for now; re-enabled in a separate
  # commit together with lib/chemotion/ai4_chemotion_service.rb.
  #
  # # Detect vendor from chemical_data.
  # def detect_vendor(chemical)
  #   return nil unless chemical.chemical_data.is_a?(Array) && chemical.chemical_data[0].is_a?(Hash)
  #
  #   data = chemical.chemical_data[0]
  #   return 'merck' if data['merckProductInfo'].present?
  #   return 'thermofischer' if data['alfaProductInfo'].present?
  #
  #   # Fallback: extract vendor from safetySheetPath file path
  #   if data['safetySheetPath'].is_a?(Array) && data['safetySheetPath'].any?
  #     entry = data['safetySheetPath'].last
  #     link = entry.is_a?(Hash) ? entry.values.find { |v| v.is_a?(String) && v.include?('/safety_sheets/') } : entry
  #     if link.present?
  #       match = link.match(%r{/safety_sheets/([^/]+)/})
  #       return match[1] if match
  #     end
  #   end
  #
  #   nil
  # end
  #
  # # Poll ai4chemotion job until SUCCESS or FAILURE, with backoff.
  # def poll_until_complete(job_id)
  #   max_polls = 120
  #   interval = 5 # seconds
  #
  #   max_polls.times do |i|
  #     sleep(interval)
  #
  #     status_resp = Chemotion::Ai4ChemotionService.job_status(job_id)
  #     current_status = status_resp['status']
  #     remote_progress = status_resp['progress'] || 0
  #
  #     # Map remote progress (0.0-1.0) to our percent (10-85)
  #     mapped_percent = 10 + (remote_progress * 75).to_i
  #     progress.progress = mapped_percent
  #     status[:stage] = "extracting (#{current_status})"
  #
  #     case current_status
  #     when 'SUCCESS'
  #       return Chemotion::Ai4ChemotionService.job_result(job_id)
  #     when 'FAILURE'
  #       return Chemotion::Ai4ChemotionService.job_result(job_id)
  #     end
  #
  #     # Increase interval after first few polls
  #     interval = 10 if i > 10
  #   end
  #
  #   { 'status' => 'FAILURE', 'errors' => ['Extraction timed out after polling'] }
  # end

  # Merge LLM extraction result into chemical_data.
  #
  # @param model_used      [String, nil] the LLM model that actually served the task
  #   (LlmTaskRunner#model_used), stored so the UI can show which model was used.
  # @param requested_model [String, nil] the task-specific model that was requested
  #   but was unavailable, when the runner fell back to the default model. nil when
  #   no fallback happened; lets the UI show "requested X, fell back to <model>".
  def update_chemical_data(chemical, extraction_result, model_used: nil, requested_model: nil)
    data  = chemical.chemical_data.deep_dup
    entry = data[0] || {}

    # Safety phrases (H/P/EUH codes) from extracted data
    entry['safetyPhrases'] = (entry['safetyPhrases'] || {}).merge(build_safety_phrases(extraction_result))

    # Merge physical properties if present
    properties = extraction_result['properties']
    entry['extractedProperties'] = properties if properties.is_a?(Hash) && properties.any?

    entry['ai4chemotion'] = extraction_metadata(extraction_result, model_used, requested_model)
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
