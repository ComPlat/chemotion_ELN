module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    helpers do
      def serialization_by_elements(elements)
        serialized_samples = elements.fetch(:samples, []).map{|s| SampleSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_reactions = elements.fetch(:reactions, []).map{|s| ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_wellplates = elements.fetch(:wellplates, []).map{|s| WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_screens = elements.fetch(:screens, []).map{|s| ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys}

        {
          samples: {
            elements: serialized_samples,
            totalElements: elements.fetch(:samples, []).size
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: elements.fetch(:reactions, []).size
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: elements.fetch(:wellplates, []).size
          },
          screens: {
            elements: serialized_screens,
            totalElements: elements.fetch(:screens, []).size
          }
        }
      end

      def scope_by_search_by_method_arg_and_collection_id(search_by_method, arg, collection_id)
        scope = case search_by_method
        when 'sum_formula', 'iupac_name', 'sample_name'
          Sample.search_by(search_by_method, arg)
        when 'reaction_name'
          Reaction.search_by(search_by_method, arg)
        when 'wellplate_name'
          Wellplate.search_by(search_by_method, arg)
        when 'screen_name'
          Screen.search_by(search_by_method, arg)
        when 'substring'
          AllElementSearch.new(arg).search_by_substring
        end

        unless params[:collection_id] == "all"
          scope = scope.by_collection_id(params[:collection_id].to_i)
        end
        scope
      end

      def elements_by_scope(scope)
        return {} if scope.empty?

        elements = {}

        case scope.first
        when Sample
          elements[:samples] = scope
          elements[:reactions] = scope.flat_map(&:reactions).uniq
          elements[:wellplates] = scope.flat_map(&:well).compact.flat_map(&:wellplate).uniq
          elements[:screens] = elements[:wellplates].flat_map(&:screen).compact.uniq
        when Reaction
          elements[:reactions] = scope
          elements[:samples] = scope.flat_map(&:samples).uniq
          elements[:wellplates] = elements[:samples].flat_map(&:well).compact.flat_map(&:wellplate).uniq
          elements[:screens] = elements[:wellplates].flat_map(&:screen).compact.uniq
        when Wellplate
          elements[:wellplates] = scope
          elements[:screens] = scope.flat_map(&:screen).compact.uniq
          elements[:samples] = scope.flat_map(&:wells).compact.flat_map(&:sample).uniq
          elements[:reactions] = elements[:samples].flat_map(&:reactions).uniq
        when Screen
          elements[:screens] = scope
          elements[:wellplates] = scope.flat_map(&:wellplates).uniq
          elements[:samples] = elements[:wellplates].flat_map(&:wells).compact.flat_map(&:sample).uniq
          elements[:reactions] = elements[:samples].flat_map(&:reactions).uniq
        when AllElementSearch::Results
          elements[:samples] = scope.samples
          elements[:reactions] = (scope.reactions + elements[:samples].flat_map(&:reactions)).uniq
          elements[:wellplates] = (scope.wellplates + elements[:samples].flat_map(&:well).compact.flat_map(&:wellplate)).uniq
          elements[:screens] = (scope.screens + elements[:wellplates].flat_map(&:screen).compact).uniq
        end

        elements
      end
    end

    resource :search do
      namespace :all do
        desc "Return all matched elements and associations"
        params do
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = scope_by_search_by_method_arg_and_collection_id(search_by_method, arg, params[:collection_id])

          serialization_by_elements(elements_by_scope(scope))
        end
      end

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

          serialization_by_elements(elements_by_scope(samples))
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

          serialization_by_elements(elements_by_scope(reactions))
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

          serialization_by_elements(elements_by_scope(wellplates))
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

          serialization_by_elements(elements_by_scope(screens))
        end
      end

    end
  end
end
