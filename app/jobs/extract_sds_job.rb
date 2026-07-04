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

  def perform(sample_id:, user_id:)
    self.priority = self.class.default_priority

    @user_id  = user_id
    @sample_id = sample_id
    @notification_message = 'SDS extraction completed successfully.'
    @notification_level = 'info'
    @notification_action = nil

    chemical = Chemical.find_by(sample_id: sample_id)
    unless chemical
      @notification_message = "SDS extraction failed: no chemical record for sample #{sample_id}."
      @notification_level = 'error'
      return
    end

    file_path = resolve_sds_path(chemical)
    unless file_path
      @notification_message = 'SDS extraction failed: no SDS file found for this chemical.'
      @notification_level = 'error'
      return
    end

    user = User.find_by(id: user_id)

    # SF-05: use the user's configured LLM provider.
    if user && provider_path_available?(user)
      run_with_provider(chemical, user, file_path)
    else
      @notification_message = 'SDS extraction failed: no LLM provider is configured. ' \
                              'Set one up in Profile → AI Settings, or ask your admin ' \
                              'to configure the institution provider.'
      @notification_level = 'error'
      # Legacy ai4chemotion fallback (re-enabled in a separate commit):
      # run_with_ai4chemotion(chemical, file_path, sample_id)
    end
  rescue Errors::LlmNotConfiguredError, Errors::LlmProviderError => e
    @notification_message = "SDS extraction error: #{e.message}"
    @notification_level = 'error'
    Rails.logger.error "ExtractSdsJob LLM error: #{e.class} - #{e.message}"
  rescue SdsPdfTextExtractor::ExtractionError => e
    @notification_message = "SDS extraction error: #{e.message}"
    @notification_level = 'error'
    Rails.logger.error "ExtractSdsJob PDF extraction error: #{e.message}"
  # Legacy ai4chemotion rescues (re-enabled in a separate commit):
  # rescue Chemotion::Ai4ChemotionService::ServiceUnavailableError => e
  #   @notification_message = "SDS extraction unavailable: #{e.message}"
  #   @notification_level = 'error'
  #   Rails.logger.error "ExtractSdsJob ServiceUnavailable: #{e.message}"
  # rescue Chemotion::Ai4ChemotionService::ExtractionError => e
  #   @notification_message = "SDS extraction error: #{e.message}"
  #   @notification_level = 'error'
  #   Rails.logger.error "ExtractSdsJob ExtractionError: #{e.message}"
  rescue StandardError => e
    @notification_message = "SDS extraction error: #{e.message}"
    @notification_level = 'error'
    Rails.logger.error "ExtractSdsJob error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace&.first(5)&.join("\n")
  end

  def max_attempts
    1
  end

  private

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
    extraction_result = LlmTaskRunner.run(
      task_name: 'sds_extraction',
      user: user,
      context: pdf_text,
    )

    progress.progress = 90
    status[:stage] = 'updating_record'
    update_chemical_data(chemical, extraction_result)

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

  # Find the SDS file on disk from chemical_data.
  def resolve_sds_path(chemical)
    return nil unless chemical.chemical_data.is_a?(Array) && chemical.chemical_data[0].is_a?(Hash)

    data = chemical.chemical_data[0]

    # Try safetySheetPath first (set by save_safety_datasheet / save_manual_sds)
    if data['safetySheetPath'].is_a?(Array) && data['safetySheetPath'].any?
      # safetySheetPath entries are hashes like { "295302_37d4e21b_link" => "/safety_sheets/merck/295302_web_37d4e21b.pdf" }
      entry = data['safetySheetPath'].last
      relative_path = if entry.is_a?(Hash)
                        entry.values.find { |v| v.is_a?(String) && v.include?('/safety_sheets/') }
                      else
                        entry
                      end

      if relative_path.present?
        abs_path = Rails.public_path.join(relative_path.sub(%r{^/}, '')).to_s
        return abs_path if File.exist?(abs_path)
      end
    end

    # Fallback: check vendor product info for sdsLink local paths
    %w[merckProductInfo alfaProductInfo].each do |key|
      next unless data[key].is_a?(Hash) && data[key]['sdsLink'].present?

      link = data[key]['sdsLink']
      next if link.start_with?('http')

      abs_path = Rails.public_path.join(link.sub(%r{^/}, '')).to_s
      return abs_path if File.exist?(abs_path)
    end

    nil
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
  def update_chemical_data(chemical, extraction_result)
    data = chemical.chemical_data.deep_dup
    entry = data[0] || {}

    # Build safety phrases (H/P/EUH codes) from extracted data
    safety_phrases = build_safety_phrases(extraction_result)
    entry['safetyPhrases'] = (entry['safetyPhrases'] || {}).merge(safety_phrases)

    # Merge physical properties if present
    if extraction_result['properties'].is_a?(Hash) && extraction_result['properties'].any?
      entry['extractedProperties'] = extraction_result['properties']
    end

    # Store raw extraction metadata — used by the frontend AI result modal
    metadata = {
      'extracted_at' => Time.current.iso8601,
      'chemical_name' => extraction_result['chemical_name'],
      'signal_word' => extraction_result['signal_word'],
    }

    if extraction_result['is_mixture']
      metadata['is_mixture'] = true
      # Store component list for mixtures (each entry has name, cas_number, concentration)
      if extraction_result['mixture_components'].is_a?(Array) && extraction_result['mixture_components'].any?
        metadata['mixture_components'] = extraction_result['mixture_components']
      end
    else
      metadata['cas_number'] = extraction_result['cas_number']
      metadata['molecular_formula'] = extraction_result['molecular_formula']
    end

    entry['ai4chemotion'] = metadata.compact
    entry.delete('extraction_error') # clear any prior failure marker on success

    data[0] = entry
    chemical.update!(chemical_data: data)
  end

  # Write a failure marker into chemical_data[0] so the frontend polling detects
  # the error (via its changed +failed_at+) and resets the "Extracting…" button.
  def persist_extraction_failure
    return unless @sample_id

    chemical = Chemical.find_by(sample_id: @sample_id)
    return unless chemical&.chemical_data.is_a?(Array) && chemical.chemical_data[0].is_a?(Hash)

    data = chemical.chemical_data.deep_dup
    data[0]['extraction_error'] = {
      'message'   => @notification_message,
      'failed_at' => Time.current.iso8601,
    }
    chemical.update_columns(chemical_data: data) # skip validations/callbacks — marker only
  rescue StandardError => e
    Delayed::Worker.logger.error "ExtractSdsJob failure-marker error: #{e.message}"
  end

  # Convert flat code arrays to Chemotion's hash format using reference data.
  def build_safety_phrases(extraction_result)
    phrases = {}

    if extraction_result['hazard_statements'].is_a?(Array) && extraction_result['hazard_statements'].any?
      phrases['h_statements'] = map_codes_to_descriptions(
        extraction_result['hazard_statements'],
        hazard_phrases_lookup,
      )
    end

    # European supplemental hazard statements (EUH-XXX)
    if extraction_result['eu_h_statements'].is_a?(Array) && extraction_result['eu_h_statements'].any?
      eu_mapped = map_codes_to_descriptions(extraction_result['eu_h_statements'], hazard_phrases_lookup)
      phrases['h_statements'] = (phrases['h_statements'] || {}).merge(eu_mapped)
    end

    if extraction_result['precautionary_statements'].is_a?(Array) && extraction_result['precautionary_statements'].any?
      phrases['p_statements'] = map_codes_to_descriptions(
        extraction_result['precautionary_statements'],
        precautionary_phrases_lookup,
      )
    end

    if extraction_result['ghs_codes'].is_a?(Array) && extraction_result['ghs_codes'].any?
      phrases['pictograms'] = Chemotion::ChemicalsService.construct_pictograms(
        extraction_result['ghs_codes'],
      )
    end

    phrases
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
    @hazard_phrases_lookup ||= JSON.parse(
      File.read(Rails.public_path.join('json', 'hazardPhrases.json')),
    )
  end

  def precautionary_phrases_lookup
    @precautionary_phrases_lookup ||= JSON.parse(
      File.read(Rails.public_path.join('json', 'precautionaryPhrases.json')),
    )
  end
end
