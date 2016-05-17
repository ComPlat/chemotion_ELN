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
        when 'polymer_type'
          Sample.for_user(current_user.id).joins(:residues).where("residues.custom_info -> 'polymer_type' ILIKE '%#{arg}%'")
        when 'sum_formula', 'iupac_name', 'sample_name', 'sample_short_label'
          Sample.for_user(current_user.id).search_by(search_by_method, arg)
        when 'reaction_name'
          Reaction.for_user(current_user.id).search_by(search_by_method, arg)
        when 'wellplate_name'
          Wellplate.for_user(current_user.id).search_by(search_by_method, arg)
        when 'screen_name'
          Screen.for_user(current_user.id).search_by(search_by_method, arg)
        when 'substring'
          AllElementSearch.new(arg, current_user.id).search_by_substring
        end

        scope = scope.by_collection_id(params[:collection_id].to_i)

        scope
      end

      def elements_by_scope(scope)
        return {} if scope.empty?

        elements = {}

        case scope.first
        when Sample
          elements[:samples] = scope
          elements[:reactions] = (Reaction.for_user(current_user.id).by_material_ids(scope.map(&:id)) + Reaction.for_user(current_user.id).by_reactant_ids(scope.map(&:id)) + Reaction.for_user(current_user.id).by_product_ids(scope.map(&:id))).uniq
          elements[:wellplates] = Wellplate.for_user(current_user.id).by_sample_ids(scope.map(&:id)).uniq
          elements[:screens] = Screen.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id))
        when Reaction
          elements[:reactions] = scope
          elements[:samples] = (Sample.for_user(current_user.id).by_reaction_reactant_ids(scope.map(&:id)) + Sample.for_user(current_user.id).by_reaction_product_ids(scope.map(&:id)) + Sample.for_user(current_user.id).by_reaction_material_ids(scope.map(&:id))).uniq
          elements[:wellplates] = Wellplate.for_user(current_user.id).by_sample_ids(elements[:samples].map(&:id)).uniq
          elements[:screens] = Screen.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id))
        when Wellplate
          elements[:wellplates] = scope
          elements[:screens] = Screen.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id)).uniq
          elements[:samples] = Sample.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id)).uniq
          elements[:reactions] = (Reaction.for_user(current_user.id).by_material_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_reactant_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_product_ids(elements[:samples].map(&:id))).uniq
        when Screen
          elements[:screens] = scope
          elements[:wellplates] = Wellplate.for_user(current_user.id).by_screen_ids(scope.map(&:id)).uniq
          elements[:samples] = Sample.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id)).uniq
          elements[:reactions] = (Reaction.for_user(current_user.id).by_material_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_reactant_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_product_ids(elements[:samples].map(&:id))).uniq
        when AllElementSearch::Results
          elements[:samples] = scope.samples
          elements[:reactions] = (scope.reactions + (Reaction.for_user(current_user.id).by_material_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_reactant_ids(elements[:samples].map(&:id)) + Reaction.for_user(current_user.id).by_product_ids(elements[:samples].map(&:id)))).uniq
          elements[:wellplates] = (scope.wellplates + Wellplate.for_user(current_user.id).by_sample_ids(elements[:samples].map(&:id))).uniq
          elements[:screens] = (scope.screens + Screen.for_user(current_user.id).by_wellplate_ids(elements[:wellplates].map(&:id))).uniq
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

          samples = scope.by_collection_id(params[:collection_id].to_i)

          serialization_by_elements_and_page(elements_by_scope(samples), params[:page])
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

          reactions = scope.by_collection_id(params[:collection_id].to_i)

          serialization_by_elements_and_page(elements_by_scope(reactions), params[:page])
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

          wellplates = scope.by_collection_id(params[:collection_id].to_i)

          serialization_by_elements_and_page(elements_by_scope(wellplates), params[:page])
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

          screens = scope.by_collection_id(params[:collection_id].to_i)

          serialization_by_elements_and_page(elements_by_scope(screens), params[:page])
        end
      end

    end
  end
end
