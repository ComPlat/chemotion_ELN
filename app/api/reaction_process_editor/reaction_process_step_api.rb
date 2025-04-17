# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessStepAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder

    helpers StrongParamsHelpers

    rescue_from :all

    namespace :reaction_process_steps do
      route_param :id do
        before do
          @reaction_process_step = ::ReactionProcessEditor::ReactionProcessStep.find_by(id: params[:id])
          error!('404 Not Found', 404) unless @reaction_process_step&.creator == current_user
        end

        desc 'Get a ReactionProcessStep'
        get do
          present @reaction_process_step, with: Entities::ReactionProcessEditor::ReactionProcessStepEntity,
                                          root: :reaction_process_step
        end

        desc 'Update ReactionProcessStep'
        params do
          requires :reaction_process_step, type: Hash do
            optional :name
            optional :locked
            optional :automation_status
          end
        end

        put do
          @reaction_process_step.update permitted_params[:reaction_process_step]
          if @reaction_process_step.name.blank?
            @reaction_process_step.update(name: "Step #{@reaction_process_step.position + 1}")
          end

          @reaction_process_step.update(reaction_process_vessel:
            Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate.execute!(
              reaction_process_id: @reaction_process_step.reaction_process_id,
              reaction_process_vessel_params: params[:reaction_process_step][:reaction_process_vessel],
            ))

          Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused.execute!(
            reaction_process_id: @reaction_process_step.reaction_process_id,
          )

          present @reaction_process_step, with: Entities::ReactionProcessEditor::ReactionProcessStepEntity,
                                          root: :reaction_process_step
        end

        desc 'Update Position of a ReactionProcessStep within the ReactionProcess (i.e. re-sort)'
        put :update_position do
          Usecases::ReactionProcessEditor::ReactionProcessSteps::UpdatePosition.execute!(
            reaction_process_step: @reaction_process_step, position: params[:position],
          )
        end

        desc 'Destroy a ReactionProcessStep'
        delete do
          Usecases::ReactionProcessEditor::ReactionProcessSteps::Destroy
            .execute!(reaction_process_step: @reaction_process_step)

          Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused.execute!(
            reaction_process_id: @reaction_process_step.reaction_process_id,
          )
        end

        namespace :activities do
          params do
            requires :activity, type: Hash do
              requires :activity_name, type: String, desc: 'Name of the Action described'
              requires :workup, type: Hash, desc: 'Custom Action Parameters'
              optional :reaction_process_vessel, type: Hash
            end
            optional :insert_before
          end

          desc 'Create & append a ReactionProcessActivity'
          post do
            activity = Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendActivity
                       .execute!(reaction_process_step: @reaction_process_step,
                                 activity_params: permitted_params[:activity],
                                 position: params[:insert_before])

            if activity&.valid?
              status 201
              present activity, with: Entities::ReactionProcessEditor::ReactionProcessActivityEntity,
                                root: :reaction_process_activity
            else
              status 422
              activity.errors
            end
          end
        end
      end
    end
  end
end
