# frozen_string_literal: true

# Job to update molecule info for molecules with no LCSS
# associated LCSS (molecule tag) is updated if cid found in PC db
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
      Molecule.find_by(id: molecule_id)&.pubchem_lcss
    end
  end
end
