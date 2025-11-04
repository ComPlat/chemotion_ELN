# frozen_string_literal: true

module ReactionProcessEditor
  class SampleAPI < Grape::API
    helpers StrongParamsHelpers

    rescue_from :all

    namespace :samples do
      get do
        reactions = if params[:collection_id]
                      begin
                        Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                                  .find(params[:collection_id]).reactions
                      rescue ActiveRecord::RecordNotFound
                        Reaction.none
                      end
                    else
                      current_user.collections.includes([:reactions]).map(&:reactions).flatten.uniq
                    end.sort_by(&:id)

        present reactions, with: Entities::ReactionProcessEditor::ReactionEntity, root: :reactions
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
