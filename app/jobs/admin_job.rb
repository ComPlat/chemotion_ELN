# frozen_string_literal: true

# Job to update molecule info(molecule tag) for molecules with no chemrepo_id if
# inchikey found in ChemotionRepository
class AdminJob < ApplicationJob
  queue_as :admin

  def perform(task)
    case task
    when 'collection_restore'
      load Rails.root.join('db/seeds/shared/collections.seed.rb')
    end
  end
end
