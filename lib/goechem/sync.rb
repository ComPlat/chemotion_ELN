# frozen_string_literal: true

# GoeChem::Sync pulls the chemical inventory for a GoeChem user's department
# and creates or updates the corresponding Samples and Chemicals in Chemotion
# (one Sample + one Chemical per GoeChem inventory row, matched by
# xref->>'goechem_id' within the target collection).
#
# The target collection is either:
#   * an explicit collection (collection_id:) owned by the user — supports the
#     planned per-collection sync rights model, or
#   * the user's dedicated "GoeChem Inventory" collection, auto-created on demand.
#
# Usage:
#   GoeChem::Sync.new(user_id: 5, goechem_user_id: 10001).process
#   GoeChem::Sync.new(user_id: 5, goechem_user_id: 10001, collection_id: 117).process
#
module GoeChem
  class Sync
    COLLECTION_LABEL = 'GoeChem Inventory'

    attr_reader :processed, :errors, :collection

    # @param user_id [Integer] Chemotion user the synced records belong to
    # @param goechem_user_id [String, Integer] GoeChem userid whose inventory is fetched
    # @param collection_id [Integer, nil] optional target collection; must be owned by
    #   the user (raises ActiveRecord::RecordNotFound otherwise). Defaults to the
    #   auto-created "GoeChem Inventory" collection.
    def initialize(user_id:, goechem_user_id:, collection_id: nil)
      @goechem_user_id = goechem_user_id
      @chemotion_user  = User.find(user_id)
      @collection      = resolve_collection(collection_id)
      @client          = GoeChem::Client.new
      @molecule_cache  = {}
      @processed       = 0
      @errors          = []
    end

    # Fetch all rows from the GoeChem API and sync each one.
    # @return [Hash] message, processed count, per-row errors and the target collection
    def process
      process_rows(@client.chemicals(@goechem_user_id))
    rescue GoeChem::ConnectionError => e
      { message: "GoeChem connection failed: #{e.message}", processed: 0, errors: [e.message] }
    end

    # Sync a pre-filtered set of GoeChem rows (used by GoeChem::FetchUpdates for
    # incremental syncs). Each row either updates the existing Sample/Chemical pair
    # (matched by goechem_id) or creates a new one.
    # @param rows [Array<Hash>] GoeChem CHEMIKALIENBESTAND rows
    # @return [Hash] same shape as #process
    def process_rows(rows)
      rows.each { |row| sync_row(row) }

      {
        message: "GoeChem sync complete: #{@processed} synced, #{@errors.size} errors.",
        processed: @processed,
        errors: @errors,
        collection: { id: @collection.id, label: @collection.label },
      }
    end

    private

    # Resolve the target collection. An explicit collection_id is verified to belong
    # to the user — this is the hook for the future "collection owner may run sync"
    # rights model. Without an explicit id, find or create the per-user
    # "GoeChem Inventory" collection.
    def resolve_collection(collection_id)
      return Collection.find_by!(id: collection_id, user_id: @chemotion_user.id) if collection_id.present?

      Collection.find_or_create_by!(user_id: @chemotion_user.id, label: COLLECTION_LABEL) do |collection|
        collection.is_locked = false
        collection.shared    = false
      end
    end

    # Create or update the Sample/Chemical pair for one GoeChem row. Row-level
    # failures are collected in @errors so one bad row never aborts the whole sync.
    def sync_row(row)
      goechem_id = row['id'].to_s
      raise ArgumentError, "GoeChem row missing required 'id' field" if goechem_id.blank?

      persist_row(find_existing_sample(goechem_id), row)
      @processed += 1
    rescue StandardError => e
      @errors << { goechem_id: row['id'], name: row['name'], error: e.message }
      Rails.logger.error "[GoeChem::Sync] id=#{row['id']} (#{row['name']}): #{e.message}"
    end

    # Apply the mapped attributes to the (new or existing) sample and its Chemical
    # inside one transaction so a partial row never persists.
    def persist_row(existing, row)
      sample_attrs   = GoeChem::Mapper.to_sample_attrs(row)
      chemical_attrs = GoeChem::Mapper.to_chemical_attrs(row)

      sample_attrs[:xref] = (existing.xref || {}).merge(sample_attrs[:xref].stringify_keys) if existing

      ActiveRecord::Base.transaction do
        sample = existing || build_new_sample
        sample.assign_attributes(sample_attrs)
        attach_molecule(sample, row)

        # has_collections validation requires a collection before the first save
        sample.collections << @collection if sample.new_record?
        sample.save!

        upsert_chemical(sample, chemical_attrs)
      end
    end

    # The goechem_id ↔ sample mapping is scoped to the target collection so the
    # same GoeChem inventory can be synced into different collections independently.
    def find_existing_sample(goechem_id)
      Sample
        .joins(:collections_samples)
        .where(collections_samples: { collection_id: @collection.id })
        .where("xref->>'goechem_id' = ?", goechem_id)
        .where(deleted_at: nil)
        .first
    end

    def build_new_sample
      Sample.new(
        created_by: @chemotion_user.id,
        user_id: @chemotion_user.id,
      )
    end

    # Every synced sample must be either molecule-coupled or explicitly decoupled
    # (carrying the dummy molecule, per the Chemotion convention used by sample
    # import). On updates the molecule state from the first sync is preserved.
    def attach_molecule(sample, row)
      return if molecule_already_resolved?(sample)

      molecule = resolve_molecule(row)
      if molecule
        sample.molecule  = molecule
        sample.decoupled = false
      else
        assign_decoupled(sample, row)
      end
    rescue StandardError => e
      Rails.logger.warn "[GoeChem::Sync] molecule resolution failed for row #{row['id']}: #{e.message}"
      assign_decoupled(sample, row)
    end

    # Updates keep the coupled/decoupled state established by the first sync —
    # re-resolving on every run would cost an API call per row for nothing.
    def molecule_already_resolved?(sample)
      !sample.new_record? && (sample.molecule_id.present? || sample.decoupled?)
    end

    # @return [Molecule, nil] the molecule for the row's CAS number, if resolvable
    def resolve_molecule(row)
      cas = row['cas'].presence || row['casnr'].presence
      return nil if cas.blank?

      molecule_for_cas(cas)
    end

    # Decoupled fallback: dummy molecule (inchikey 'DUMMY') plus the GoeChem
    # sum formula ("formel") so the sample still displays a formula.
    def assign_decoupled(sample, row)
      sample.molecule    = Molecule.find_or_create_dummy
      sample.decoupled   = true
      sample.sum_formula = row['formel'].presence
    end

    # Memoized per sync run — the same CAS often appears on many inventory rows
    # and each unresolved lookup costs an external API round-trip. Nil results
    # are cached too so failing CAS numbers are only looked up once.
    def molecule_for_cas(cas)
      return @molecule_cache[cas] if @molecule_cache.key?(cas)

      @molecule_cache[cas] = fetch_molecule_from_cas(cas)
    end

    # Resolve a CAS number to a Molecule via the repo-standard lookup chain:
    # Chemotion::CasLookupService (CAS Common Chemistry with PubChem fallback)
    # -> SMILES -> Molecule.find_or_create_by_cano_smiles (dedupes by InChIKey).
    # @return [Molecule, nil] nil when the CAS cannot be resolved
    def fetch_molecule_from_cas(cas)
      smiles = Chemotion::CasLookupService.fetch_by_cas(cas)&.dig(:smiles)
      return nil if smiles.blank?

      Molecule.find_or_create_by_cano_smiles(smiles)
    rescue StandardError => e
      Rails.logger.warn "[GoeChem::Sync] CAS lookup failed for #{cas}: #{e.message}"
      nil
    end

    # Create or update the 1:1 Chemical for the sample. On update, GoeChem-sourced
    # keys (amount/volume/status/safetyPhrases/goechemProductInfo) are overlaid onto
    # the existing chemical_data entry; keys from other sources (merckProductInfo,
    # ai4chemotion, ...) are preserved.
    def upsert_chemical(sample, attrs)
      chemical = Chemical.find_or_initialize_by(sample_id: sample.id)

      if chemical.persisted? && chemical.chemical_data.present?
        goechem_entry  = (attrs[:chemical_data] || [{}]).first || {}
        existing_entry = chemical.chemical_data.first || {}
        attrs = attrs.merge(chemical_data: [existing_entry.merge(goechem_entry)])
      end

      chemical.assign_attributes(attrs)
      chemical.save!
    end
  end
end
