# frozen_string_literal: true

# Job to update molecule info(molecule tag) for molecules with no chemrepo_id if
# inchikey found in ChemotionRepository
class AdminJob < ApplicationJob
  queue_as :admin

  def perform(task)
    case task
    when 'collection_restore'
      load Rails.root.join('db/seeds/shared/collections.seed.rb')
    when 'install_ketcher2'
      Open3.popen3('bin/chem-ket2-install.sh', chdir: Rails.root)
    when 'rerender_reactions'
      SvgReactionRendering.new.render
    end
  end
end
