# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessActivityAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder

    helpers StrongParamsHelpers

    rescue_from :all

    namespace :reaction_process_activities do
      route_param :id, format: :uuid do
        before do
          @activity = ::ReactionProcessEditor::ReactionProcessActivity.find_by(id: params[:id])
          error!('404 Not Found', 404) unless @activity&.creator == current_user
        end

        params do
          requires :activity, type: Hash do
            requires :workup, type: Hash, desc: 'Generic Activity workup hash bearing the details.'
            optional :reaction_process_vessel, type: Hash, desc: 'Optional vessel associated with this activity.'
          end
        end

        desc 'Update a ReactionProcessActivity.'
        put do
          present Usecases::ReactionProcessEditor::ReactionProcessActivities::Update.execute!(
            activity: @activity, activity_params: permitted_params[:activity],
          ), with: Entities::ReactionProcessEditor::ReactionProcessActivityEntity, root: :reaction_process_activity
        end

        desc 'Create and append an action for the pooling groups.'
        put :append_pooling_groups do
          pooling_groups = params[:pooling_groups]

          pooling_groups.each_with_index do |pooling_group, index|
            Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity
              .execute!(reaction_process_step: @activity.reaction_process_step,
                        pooling_group_params: pooling_group,
                        position: @activity.position + 1 + index)
          end

          @activity.workup['AUTOMATION_STATUS'] = 'HALT_RESOLVED_NEEDS_CONFIRMATION'
          @activity.save
        end

        desc 'Update Position of a ReactionProcessActivity'
        put :update_position do
          Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition.execute!(
            activity: @activity,
            position: params[:position],
          )
        end

        desc 'Delete a ReactionProcessActivity'
        delete do
          Usecases::ReactionProcessEditor::ReactionProcessActivities::Destroy.execute!(activity: @activity)
        end
      end

      route_param :id do
        params do
          requires :response_json
        end

        put :automation_response do
          error!('404 Not Found', 404) unless current_user.is_a?(ReactionProcessEditor::ApiUser)

          @activity = ::ReactionProcessEditor::ReactionProcessActivity.find_by(id: params[:id])

          response_file = params[:response_json].tempfile

          Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationResponse.execute!(
            activity: @activity,
            response_json: response_file,
          )
        rescue StandardError
          error!('422 Unprocessable Entity', 422)
        end

        params do
          requires :status
        end

        put :automation_status do
          error!('404 Not Found', 404) unless current_user.is_a?(ReactionProcessEditor::ApiUser)

          @activity = ::ReactionProcessEditor::ReactionProcessActivity.find_by(id: params[:id])

          Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationStatus.execute!(
            activity: @activity,
            automation_status: params[:status],
          )
        end
      end
    end
  end
end
