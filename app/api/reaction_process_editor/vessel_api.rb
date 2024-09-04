# frozen_string_literal: true

module ReactionProcessEditor
  class VesselAPI < Grape::API
    rescue_from :all

    namespace :vessels do
      get do
        vessels = current_user.created_vessels.includes([:vessel_template]) +
                  current_user.vessels.includes([:vessel_template])

        present vessels, with: Entities::ReactionProcessEditor::VesselEntity, root: :vessels
      end
    end
  end
end
