# frozen_string_literal: true

# Per-molecule PubChem enrichment job, scheduled for every newly created molecule via
# Molecule.schedule_lcss_batch (directly for batch imports, or via the after_create_commit
# :get_lcss hook). For each molecule it enriches names/iupac/cid from PubChem (see
# Molecule#enrich_from_pubchem) and then updates the LCSS molecule tag. This is where the
# PubChem network work moved to after it was removed from the synchronous create path.
class PubchemSingleLcssJob < ApplicationJob
  queue_as :single_pubchem_lcss

  # NB: PC has request restriction policy, hence the sleep — matches the
  # spacing already used by the sibling cron batch job, PubchemLcssJob.
  SLEEP_BETWEEN_REQUESTS = 0.5

  # @param molecule_ids [Array<Integer>] ids of molecules to fetch LCSS data for,
  #   processed sequentially with a real sleep between requests so pacing holds
  #   regardless of how many workers poll this queue or how far behind it fell.
  def perform(molecule_ids)
    # TODO > stub request for testing
    return if Rails.env.test?

    Array(molecule_ids).each_with_index do |molecule_id, i|
      sleep SLEEP_BETWEEN_REQUESTS if i.positive?
      molecule = Molecule.find_by(id: molecule_id)
      next unless molecule

      # Enrich (iupac_name/names/cid) before LCSS so the cid is already persisted and
      # Molecule#pubchem_lcss doesn't fall back to its own get_cid_from_inchikey lookup.
      molecule.enrich_from_pubchem
      molecule.pubchem_lcss
    end
  end
end
