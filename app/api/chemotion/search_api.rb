module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    helpers do
      def serialization_by_elements(samples, reactions, wellplates, screens)
        serialized_samples = samples.map{|s| SampleSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_reactions = reactions.map{|s| ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_wellplates = wellplates.map{|s| WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_screens = screens.map{|s| ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys}

        {
          samples: {
            elements: serialized_samples,
            totalElements: samples.size
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reactions.size
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplates.size
          },
          screens: {
            elements: serialized_screens,
            totalElements: screens.size
          }
        }
      end
    end

    resource :search do

      namespace :samples do
        desc "Return samples and associated elements by search selection"
        params do
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = Sample.search_by(search_by_method, arg)
          if params[:collection_id] == "all"
            samples = scope
          else
            samples = scope.by_collection_id(params[:collection_id].to_i)
          end
          reactions = samples.flat_map(&:reactions).uniq
          wellplates = samples.flat_map(&:well).compact.flat_map(&:wellplate).uniq
          screens = wellplates.flat_map(&:screen).uniq

          serialization_by_elements(samples, reactions, wellplates, screens)
        end
      end

      namespace :reactions do
        desc "Return reactions and associated elements by search selection"
        params do
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = Reaction.search_by(search_by_method, arg)
          if params[:collection_id] == "all"
            reactions = scope
          else
            reactions = scope.by_collection_id(params[:collection_id].to_i)
          end
          samples = reactions.flat_map(&:samples).uniq
          wellplates = samples.flat_map(&:well).compact.flat_map(&:wellplate).uniq
          screens = wellplates.flat_map(&:screen).uniq

          serialization_by_elements(samples, reactions, wellplates, screens)
        end
      end

      namespace :wellplates do
        desc "Return wellplates and associated elements by search selection"
        params do
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = Wellplate.search_by(search_by_method, arg)
          if params[:collection_id] == "all"
            wellplates = scope
          else
            wellplates = scope.by_collection_id(params[:collection_id].to_i)
          end
          screens = wellplates.flat_map(&:screen).uniq
          samples = wellplates.flat_map(&:wells).compact.flat_map(&:sample).uniq
          reactions = samples.flat_map(&:reactions).uniq

          serialization_by_elements(samples, reactions, wellplates, screens)
        end
      end

      namespace :screens do
        desc "Return wellplates and associated elements by search selection"
        params do
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = Screen.search_by(search_by_method, arg)
          if params[:collection_id] == "all"
            screens = scope
          else
            screens = scope.by_collection_id(params[:collection_id].to_i)
          end
          wellplates = screens.flat_map(&:wellplates).uniq
          samples = wellplates.flat_map(&:wells).compact.flat_map(&:sample).uniq
          reactions = samples.flat_map(&:reactions).uniq

          serialization_by_elements(samples, reactions, wellplates, screens)
        end
      end

    end
  end
end
