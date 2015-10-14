module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO implement search cache?
    helpers do
      def page_size
        7
      end

      def pages(total_elements)
        total_elements.fdiv(page_size).ceil
      end

      def serialization_by_elements_and_page(elements, page=1)
        samples = elements.fetch(:samples, [])
        reactions = elements.fetch(:reactions, [])
        wellplates = elements.fetch(:wellplates, [])
        screens = elements.fetch(:screens, [])
        serialized_samples = Kaminari.paginate_array(samples).page(page).per(page_size).map{|s| SampleSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_reactions = Kaminari.paginate_array(reactions).page(page).per(page_size).map{|s| ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_wellplates = Kaminari.paginate_array(wellplates).page(page).per(page_size).map{|s| WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys}
        serialized_screens = Kaminari.paginate_array(screens).page(page).per(page_size).map{|s| ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys}

        {
          samples: {
            elements: serialized_samples,
            totalElements: samples.size,
            page: page,
            pages: pages(samples.size),
            per_page: page_size
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reactions.size,
            page: page,
            pages: pages(reactions.size),
            per_page: page_size
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplates.size,
            page: page,
            pages: pages(wellplates.size),
            per_page: page_size
          },
          screens: {
            elements: serialized_screens,
            totalElements: screens.size,
            page: page,
            pages: pages(screens.size),
            per_page: page_size
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

        # TODO only elements of current user
        unless params[:collection_id] == "all"
          scope = scope.by_collection_id(params[:collection_id].to_i)
        end
        scope # joins(:collections).where('collections.user_id = ?', current_user.id).references(:collections)
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
          elements[:samples] = scope.flat_map(&:samples).uniq
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
        desc "Return all matched elements and associations for substring query"
        params do
          optional :page, type: Integer
          requires :selection, type: Hash
          requires :collection_id, type: String
        end

        post do
          search_by_method = params[:selection].search_by_method
          arg = params[:selection].name

          scope = scope_by_search_by_method_arg_and_collection_id(search_by_method, arg, params[:collection_id])

          serialization_by_elements_and_page(elements_by_scope(scope), params[:page])
        end
      end

      namespace :samples do
        desc "Return samples and associated elements by search selection"
        params do
          optional :page, type: Integer
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

          serialization_by_elements(elements_by_scope(samples), params[:page])
        end
      end

      namespace :reactions do
        desc "Return reactions and associated elements by search selection"
        params do
          optional :page, type: Integer
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

          serialization_by_elements(elements_by_scope(reactions), params[:page])
        end
      end

      namespace :wellplates do
        desc "Return wellplates and associated elements by search selection"
        params do
          optional :page, type: Integer
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

          serialization_by_elements(elements_by_scope(wellplates), params[:page])
        end
      end

      namespace :screens do
        desc "Return wellplates and associated elements by search selection"
        params do
          optional :page, type: Integer
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

          serialization_by_elements(elements_by_scope(screens), params[:page])
        end
      end

    end
  end
end
