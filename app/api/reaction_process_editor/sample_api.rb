# frozen_string_literal: true

module ReactionProcessEditor
  class SampleAPI < Grape::API
    helpers StrongParamsHelpers
    helpers CollectionHelpers

    rescue_from :all

    namespace :samples do
      get do
        collection_ids = [params[:collection_id]] if params[:collection_id]
        collection_ids ||= Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).map(&:id)
        samples = Sample.joins(:collections_samples)
                        .where(collections_samples: { collection_id: collection_ids }).uniq

        present samples, with: Entities::ReactionProcessEditor::SampleEntity, root: :samples
      end

      route_param :id do
        before do
          @sample = Sample.find_by(id: params[:id])
          error!('404 Not Found', 404) unless @sample

          @element_policy = ElementPolicy.new(current_user, @sample)
          error!('404 Not Found', 404) unless current_user && @element_policy.read?
        end

        desc 'Create associated reaction procedure unless existant'
        get :reaction_process do
          present Usecases::ReactionProcessEditor::ReactionProcesses::FindOrCreateBySample.execute!(
            sample: @sample,
            current_user: current_user,
          ),
                  with: Entities::ReactionProcessEditor::SampleProcessEntity,
                  root: :reaction_process
        end
      end
    end
  end
end
