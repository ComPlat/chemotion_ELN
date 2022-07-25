# frozen_string_literal: true

# Job to update molecule info for molecules with no LCSS
# associated LCSS (molecule tag) is updated if cid found in PC db
class PubchemSingleLcssJob < ApplicationJob
  queue_as :single_pubchem_lcss

  def perform(molecule)
    # TODO > stub request for testing
    return if Rails.env.test?

    molecule.pubchem_lcss
  end
end
