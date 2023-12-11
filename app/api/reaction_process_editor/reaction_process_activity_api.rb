# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessActivityAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder

    helpers StrongParamsHelpers

    rescue_from :all

    namespace :reaction_process_activities do
      route_param :id do
        before do
          @activity = ::ReactionProcessEditor::ReactionProcessActivity.find_by(id: params[:id])
          error!('404 Not Found', 404) unless @activity&.creator == current_user
        end

        params do
          requires :activity, type: Hash do
            requires :workup, type: Hash, desc: 'Generic Activity workup hash bearing the details.'
          end
        end

        desc 'Update a ReactionProcessActivity.'
        put do
          present Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdateWorkup.execute!(
            activity: @activity, workup: params[:activity][:workup],
          ), with: Entities::ReactionProcessEditor::ReactionProcessActivityEntity, root: :reaction_process_activity
        end

        desc 'Update Position of a ReactionProcessActivity'
        put :update_position do
          Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition.execute!(activity: @activity,
                                                                                              position: params[:position])
        end

        desc 'Delete a ReactionProcessActivity'
        delete do
          Usecases::ReactionProcessEditor::ReactionProcessActivities::Destroy.execute!(activity: @activity)
        end
      end
    end
  end
end
