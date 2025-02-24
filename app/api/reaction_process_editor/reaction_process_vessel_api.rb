# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessVesselAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder

    helpers StrongParamsHelpers

    rescue_from :all

    namespace :reaction_process_vessels do
      route_param :id do
        before do
          @reaction_process_vessel = ::ReactionProcessEditor::ReactionProcessVessel.find_by(id: params[:id])
          error!('404 Not Found', 404) unless @reaction_process_vessel&.creator == current_user
        end

        params do
          requires :reaction_process_vessel, type: Hash do
            optional :preparations, type: Array, desc: 'The preparations of the vessel for this reaction.'
            optional :vesselable_id
            optional :vesselable_type
          end
        end

        desc 'Update a ReactionProcessVessel'
        put do
          @reaction_process_vessel.update permitted_params[:reaction_process_vessel]

          present @reaction_process_vessel, with: Entities::ReactionProcessEditor::ReactionProcessVesselEntity,
                                            root: :reaction_process_vessel
        end
      end
    end
  end
end
