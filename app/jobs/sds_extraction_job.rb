# frozen_string_literal: true

# Runs SdsExtractor off the request thread and stores the result for the polling client.
# Cf. Chemotion::ChemicalAPI extract_sds, which enqueues it and answers from the cache.
class SdsExtractionJob < ApplicationJob
  queue_as :sds_extraction
  # Someone is waiting on the result, so it goes ahead of queued batch work (delayed_job runs lowest first).
  queue_with_priority(-10)

  UNREADABLE = 'the safety data sheet could not be read'
  GONE = 'the safety data sheet is no longer on the server'
  # Far beyond one run (ghostscript is bounded at about a minute), so a lock this old is a dead worker's.
  STALE_LOCK = 5.minutes

  # The key is in the handler, so a pending run for the same sheet is found by it.
  # @param key [String] Chemotion::SdsExtractionCache.key of the sheet
  def self.pending?(key)
    Delayed::Job.where(failed_at: nil)
                .where('locked_at IS NULL OR locked_at > ?', STALE_LOCK.ago)
                .exists?(['handler LIKE ?', "%#{key}%"])
  end

  # @param link [String] the safetySheetPath link, resolved again here rather than trusted as a path
  # @param key [String] the cache key computed when the run was requested
  def perform(link, key)
    return if Chemotion::SdsExtractionCache.read(key)

    path = Chemotion::SdsExtractor.saved_sheet_path(link)
    result = path&.file? ? Chemotion::SdsExtractor.extract(path.to_s) : failure(GONE)
    Chemotion::SdsExtractionCache.write(key, result)
  rescue StandardError => e
    # Answered rather than re-raised, so the poll ends instead of waiting out delayed_job's retries.
    Rails.logger.error("SdsExtractionJob failed: #{e.class}: #{e.message}")
    Chemotion::SdsExtractionCache.write(key, failure(UNREADABLE))
  end

  private

  def failure(message)
    { 'safetyPhrases' => {}, 'properties' => {}, 'diagnostics' => { 'notes' => [], 'errors' => [message] } }
  end
end
