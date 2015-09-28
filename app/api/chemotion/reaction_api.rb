module Chemotion
  class ReactionAPI < Grape::API
    include Grape::Kaminari

    resource :reactions do
      namespace :ui_state do
        desc "Delete reactions by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected reactions from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Reaction.for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Reaction.for_ui_state(params[:ui_state]).destroy_all
        end
      end

      desc "Return serialized reactions"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).reactions
        else
          Reaction.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction.find(params[:id])).read?
        end

        get do
          Reaction.find(params[:id])
        end
      end

      desc "Delete a reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        delete do
          Reaction.find(params[:id]).destroy
        end
      end

      desc "Delete reactions by UI state"
      params do
        requires :ui_state, type: Hash, desc: "Selected reactions from the UI"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction.find(params[:id])).destroy?
        end
        
        delete do
          Reaction.for_ui_state(params[:ui_state]).destroy_all
        end
      end
    end
  end
end
