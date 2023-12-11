# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessAPI < Grape::API
    helpers StrongParamsHelpers

    rescue_from :all

    namespace :reaction_processes do
      route_param :id do
        before do
          @reaction_process = ::ReactionProcessEditor::ReactionProcess.find(params[:id])
          error!('404 Not Found', 404) unless @reaction_process&.creator == current_user
        end

        desc 'Get a ReactionProcess'
        get do
          present @reaction_process,
                  with: Entities::ReactionProcessEditor::ReactionProcessEntity,
                  root: :reaction_process
        end

        get :ord do
          reaction = ::ReactionProcessEditor::ReactionProcess.find(params[:id]).reaction

          filename = "#{Time.zone.today.iso8601}-Reaction-#{reaction.id}-#{reaction.short_label}.kit-ord.json"
          header 'Content-Disposition', "attachment; filename*=UTF-8''#{filename}"
          content_type('application/json')

          present OrdKit::Exporter::ReactionExporter.new(reaction).to_ord
        rescue StandardError => e
          header 'Content-Disposition', "attachment; filename*=UTF-8''OrdExportError-#{filename}"
          content_type 'text/plain'
          present "#{e.message} #{e.backtrace}"
        end

        namespace :provenance do
          desc 'Update the Provenance'
          params do
            requires :provenance, type: Hash, desc: 'The Provenance of the reaction.' do
              optional :starts_at, type: String
              optional :name, type: String
              optional :username, type: String
              optional :email, type: String
              optional :city, type: String
              optional :organization, type: String
              optional :patent, type: String
              optional :orcid, type: String
              optional :doi, type: String
              optional :publication_url, type: String
            end
          end
          put do
            provenance = Usecases::ReactionProcessEditor::Provenances::FindOrCreate.execute!(
              reaction_process: @reaction_process,
            )

            provenance.update permitted_params[:provenance]
          end
        end

        namespace :reaction_default_conditions do
          desc 'Update the Default Conditions of the Reaction.'
          params do
            requires :default_conditions, type: Hash, desc: 'The Default Conditions of the Reaction.'
          end
          put do
            @reaction_process.update permitted_params
          end
        end

        namespace :samples_preparations do
          desc 'Create or Update a Sample Preparation'
          params do
            requires :sample_preparation, type: Hash, desc: 'The sample preparation to create/update.' do
              requires :sample_id, type: String
              optional :equipment, type: [String]
              optional :preparations, type: [String]
              optional :details
            end
          end
          put do
            Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate.execute!(
              reaction_process: @reaction_process, sample_preparation: permitted_params[:sample_preparation],
            )

            status params[:sample_preparation][:id] ? :ok : :created
          end

          route_param :sample_preparation_id do
            desc 'Delete a Sample preparation'
            delete do
              @sample_preparation = @reaction_process.samples_preparations.find_by(id: params[:sample_preparation_id])
              error!('401 Unauthorized', 401) unless @reaction_process.reaction.creator == current_user
              error!('404 Not Found', 404) unless @sample_preparation

              @sample_preparation.destroy
            end
          end
        end

        namespace :reaction_process_steps do
          desc 'Create an associated ReactionProcessStep'
          params do
            requires :reaction_process_step, type: Hash do
              optional :name
              optional :locked
            end
          end

          post do
            new_step = @reaction_process.reaction_process_steps.create(
              position: @reaction_process.reaction_process_steps.count,
            )

            new_step.update permitted_params[:reaction_process_step]
            new_step.update(name: "Step #{new_step.position + 1}") if new_step.name.blank?

            new_step.update(
              reaction_process_vessel: Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate.execute!(
                reaction_process_id: @reaction_process.id,
                reaction_process_vessel_params: params[:reaction_process_step][:reaction_process_vessel],
              ),
            )

            Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused.execute!(
              reaction_process_id: @reaction_process.id,
            )

            present new_step, with: Entities::ReactionProcessEditor::ReactionProcessStepEntity,
                              root: :reaction_process_step
          end
        end
      end
    end
  end
end
