# frozen_string_literal: true

# GoeChem::FetchUpdates performs an incremental sync: it fetches the full
# GoeChem inventory but only processes rows whose regzeit (GoeChem registration
# Unix timestamp) is newer than the most recent goechem_synced timestamp found
# in the target collection. Falls back to a full sync when the collection has
# never been synced.
#
# Usage mirrors GoeChem::Sync:
#   GoeChem::FetchUpdates.new(user_id: 5, goechem_user_id: 10001).message
#   GoeChem::FetchUpdates.new(user_id: 5, goechem_user_id: 10001, collection_id: 117).message
#
module GoeChem
  class FetchUpdates
    # @param user_id [Integer] Chemotion user the synced records belong to
    # @param goechem_user_id [String, Integer] GoeChem userid whose inventory is fetched
    # @param collection_id [Integer, nil] optional target collection owned by the user
    def initialize(user_id:, goechem_user_id:, collection_id: nil)
      @goechem_user_id = goechem_user_id
      @sync            = GoeChem::Sync.new(
        user_id: user_id,
        goechem_user_id: goechem_user_id,
        collection_id: collection_id,
      )
      @client = GoeChem::Client.new
    end

    # Run the incremental sync.
    # @return [String] human-readable result for the notification channel
    def message
      last_ts = last_sync_unix_timestamp

      rows    = @client.chemicals(@goechem_user_id)
      updates = last_ts ? rows.select { |row| row['regzeit'].to_i > last_ts } : rows

      if updates.empty?
        "No GoeChem updates since last sync (#{updates.size}/#{rows.size} records checked)."
      else
        @sync.process_rows(updates)
        "GoeChem incremental sync: #{@sync.processed} updated, #{@sync.errors.size} errors."
      end
    rescue GoeChem::ConnectionError => e
      "GoeChem connection error: #{e.message}"
    end

    private

    # Most recent goechem_synced ISO timestamp across the collection's samples,
    # as Unix time. Returns nil when the collection has never been synced.
    def last_sync_unix_timestamp
      iso = Sample
            .joins(:collections_samples)
            .where(collections_samples: { collection_id: @sync.collection.id })
            .where("xref ? 'goechem_synced'")
            .where(deleted_at: nil)
            .maximum("xref->>'goechem_synced'")

      iso ? Time.zone.parse(iso).to_i : nil
    rescue StandardError
      nil
    end
  end
end
