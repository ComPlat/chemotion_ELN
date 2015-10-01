module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      namespace :take_ownership do
        desc "Take ownership of collection with specified id"
        params do
          requires :id, type: Integer, desc: "Collection id"
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless CollectionPolicy.new(@current_user, Collection.find(params[:id])).take_ownership?
          end

          post do
            Collection.find(params[:id]).update(is_shared: false)
          end
        end
      end

      desc "Return all unshared serialized collection roots of current user"
      get :roots do
        current_user.collections.ordered.unshared.roots
      end

      desc "Return all shared serialized collection roots"
      get :shared_roots do
        Collection.shared(current_user.id).roots
      end

      desc "Return all remote serialized collection roots"
      get :remote_roots, each_serializer: RemoteCollectionSerializer do
        current_user.collections.remote(current_user.id).roots
      end

      desc "Bulk update and/or create new collections"
      patch '/' do
        Collection.bulk_update(current_user.id, params[:collections].as_json(except: :descendant_ids), params[:deleted_ids])
      end

      namespace :shared do
        desc "Update shared collection"
        params do
          requires :id, type: Integer
          requires :permission_level, type: Integer
          requires :sample_detail_level, type: Integer
          requires :reaction_detail_level, type: Integer
          requires :wellplate_detail_level, type: Integer
        end
        put ':id' do
          Collection.find(params[:id]).update({
            permission_level: params[:permission_level],
            sample_detail_level: params[:sample_detail_level],
            reaction_detail_level: params[:reaction_detail_level],
            wellplate_detail_level: params[:wellplate_detail_level]
          })
        end

        desc "Create shared collections"
        params do
          requires :elements_filter, type: Hash do
            optional :sample, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end

            optional :reaction, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end

            optional :wellplate, type: Hash do
              optional :all, type: Boolean
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end
          end
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
          end
          requires :user_ids, type: Array
        end

        before do
          # TODO extract getElementIds to separate class? FilterParams e.g.?
          usecase = Usecases::Sharing::ShareWithUsers.new(params)
          sample_ids = usecase.getElementIds(params[:elements_filter], Sample)
          reaction_ids = usecase.getElementIds(params[:elements_filter], Reaction)
          wellplate_ids = usecase.getElementIds(params[:elements_filter], Wellplate)

          top_secret_sample = Sample.where(id: sample_ids).pluck(:is_top_secret).any?
          top_secret_reaction = Reaction.where(id: reaction_ids).flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = Wellplate.where(id: wellplate_ids).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction

          share_samples = ElementsPolicy.new(current_user, Sample.where(id: sample_ids)).share?
          share_reactions = ElementsPolicy.new(current_user, Reaction.where(id: reaction_ids)).share?
          share_wellplates = ElementsPolicy.new(current_user, Wellplate.where(id: wellplate_ids)).share?

          sharing_allowed = share_samples && share_reactions && share_wellplates

          error!('401 Unauthorized', 401) if (!sharing_allowed || is_top_secret)
        end

        post do
          # TODO better way to do this?
          params[:collection_attributes][:shared_by_id] = current_user.id
          Usecases::Sharing::ShareWithUsers.new(params).execute!
        end
      end

      # TODO add authorization/authentication, e.g. is current_user allowed
      # to fetch this samples?
      desc "Return serialized samples for given collection id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end

      route_param :id do
        get :samples do
          Collection.find(params[:id]).samples
        end
      end

      namespace :elements do
        desc "Update the collection of a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
          requires :collection_id, type: Integer, desc: "Destination collection id"
        end
        put do
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollectionId]
          sample_ids = Sample.for_ui_state(ui_state[:sample]).pluck(:id)
          CollectionsSample.where(sample_id: sample_ids, collection_id: current_collection_id).update_all(collection_id: params[:collection_id])

          reaction_ids = Reaction.for_ui_state(ui_state[:reaction]).pluck(:id)
          CollectionsReaction.where(reaction_id: reaction_ids, collection_id: current_collection_id).update_all(collection_id: params[:collection_id])

          wellplate_ids = Wellplate.for_ui_state(ui_state[:wellplate]).pluck(:id)
          CollectionsWellplate.where(wellplate_id: wellplate_ids, collection_id: current_collection_id).update_all(collection_id: params[:collection_id])
        end

        desc "Assign a collection to a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
          requires :collection_id, type: Integer, desc: "Destination collection id"
        end
        post do
          ui_state = params[:ui_state]
          collection_id = params[:collection_id]
          current_collection_id = ui_state[:currentCollectionId]

          ui_state_sample_ids = Sample.for_ui_state(params[:ui_state][:sample]).pluck(:id)
          collection_sample_ids = CollectionsSample.where(collection_id: current_collection_id).pluck(:sample_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          sample_ids = ui_state_sample_ids & collection_sample_ids
          sample_ids.each do |id|
            CollectionsSample.find_or_create_by(sample_id: id, collection_id: collection_id)
          end


          ui_state_reaction_ids = Reaction.for_ui_state(params[:ui_state][:reaction]).pluck(:id)
          collection_reaction_ids = CollectionsReaction.where(collection_id: current_collection_id).pluck(:reaction_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          reaction_ids = ui_state_reaction_ids & collection_reaction_ids
          reaction_ids.each do |id|
            CollectionsReaction.find_or_create_by(reaction_id: id, collection_id: collection_id)
          end

          ui_state_wellplate_ids = Wellplate.for_ui_state(params[:ui_state][:wellplate]).pluck(:id)
          collection_wellplate_ids = CollectionsWellplate.where(collection_id: current_collection_id).pluck(:wellplate_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          wellplate_ids = ui_state_wellplate_ids & collection_wellplate_ids 
          wellplate_ids.each do |id|
            CollectionsWellplate.find_or_create_by(wellplate_id: id, collection_id: collection_id)
          end
        end

        desc "Remove from a collection a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI"
        end
        delete do
          ui_state = params[:ui_state]
          current_collection_id = ui_state[:currentCollectionId]

          ui_state_sample_ids = Sample.for_ui_state(params[:ui_state][:sample]).pluck(:id)
          collection_sample_ids = CollectionsSample.where(collection_id: current_collection_id).pluck(:sample_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          sample_ids = ui_state_sample_ids & collection_sample_ids
          
          CollectionsSample.where(sample_id: sample_ids, collection_id: current_collection_id).delete_all

          ui_state_reaction_ids = Reaction.for_ui_state(params[:ui_state][:reaction]).pluck(:id)
          collection_reaction_ids = CollectionsReaction.where(collection_id: current_collection_id).pluck(:reaction_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          reaction_ids = ui_state_reaction_ids & collection_reaction_ids
          
          CollectionsReaction.where(reaction_id: reaction_ids, collection_id: current_collection_id).delete_all

          ui_state_wellplate_ids = Wellplate.for_ui_state(params[:ui_state][:wellplate]).pluck(:id)
          collection_wellplate_ids = CollectionsWellplate.where(collection_id: current_collection_id).pluck(:wellplate_id)
          #TODO: Improve function for_ui_state to avoid intersection.
          wellplate_ids = ui_state_wellplate_ids & collection_wellplate_ids 

          CollectionsWellplate.where(wellplate_id: wellplate_ids, collection_id: current_collection_id).delete_all

        end

      end

      namespace :unshared do

        desc "Create an unshared collection"
        params do
          requires :label, type: String, desc: "Collection label"
        end
        post do
          Collection.create(user_id: current_user.id, label: params[:label])
        end

      end

    end
  end
end
