module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO implement search cache?
    helpers do
      @page_size = 7

      def pages(total_elements)
        total_elements.fdiv(@page_size).ceil
      end

      def get_arg
        isStructureSearch =
          params[:selection].molfile == nil ? false : true

        if (isStructureSearch)
          return params[:selection].molfile
        else
          return params[:selection].name
        end
      end

      def get_search_method
        isStructureSearch =
          params[:selection].molfile == nil ? false : true

        if (isStructureSearch)
          @page_size = params[:per_page].to_i
          return 'structure'
        else
          return params[:selection].search_by_method
        end
      end

      def serialization_by_elements_and_page(elements, page = 1)
        samples = elements.fetch(:samples, [])
        reactions = elements.fetch(:reactions, [])
        wellplates = elements.fetch(:wellplates, [])
        screens = elements.fetch(:screens, [])

        if samples.empty?
          tmp = samples
        else
          tmp = paginate(samples)
        end

        serialized_samples = {
          molecules: group_by_molecule(tmp)
        }
        serialized_reactions = Kaminari.paginate_array(reactions).page(page)
          .per(@page_size).map {|s|
            ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys
          }
        serialized_wellplates = Kaminari.paginate_array(wellplates).page(page)
          .per(@page_size).map{ |s|
            WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys
          }
        serialized_screens = Kaminari.paginate_array(screens).page(page)
          .per(@page_size).map{ |s|
            ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys
          }

        {
          samples: {
            elements: serialized_samples,
            totalElements: samples.size,
            page: page,
            pages: pages(samples.size),
            per_page: @page_size
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reactions.size,
            page: page,
            pages: pages(reactions.size),
            per_page: @page_size
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplates.size,
            page: page,
            pages: pages(wellplates.size),
            per_page: @page_size
          },
          screens: {
            elements: serialized_screens,
            totalElements: screens.size,
            page: page,
            pages: pages(screens.size),
            per_page: @page_size
          }
        }
      end

      # Generate search query
      def scope_by_search_by_method_arg_and_collection_id(search_by_method,
          arg, collection_id, is_sync = false)
        scope = case search_by_method
        when 'polymer_type'
          Sample.for_user(current_user.id).joins(:residues)
            .where("residues.custom_info -> 'polymer_type' ILIKE '%#{arg}%'")
        when 'sum_formula', 'iupac_name', 'sample_name', 'sample_short_label',
             'inchistring', 'cano_smiles'
          Sample.for_user(current_user.id).search_by(search_by_method, arg)
        when 'reaction_name'
          Reaction.for_user(current_user.id).search_by(search_by_method, arg)
        when 'wellplate_name'
          Wellplate.for_user(current_user.id).search_by(search_by_method, arg)
        when 'screen_name'
          Screen.for_user(current_user.id).search_by(search_by_method, arg)
        when 'substring'
          AllElementSearch.new(arg, current_user.id).search_by_substring
        when 'structure'
          molfile = Fingerprint.standardized_molfile arg
          threshold = params[:selection].tanimoto_threshold
          type = params[:selection].search_type

          # TODO implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
          Sample.for_user(current_user.id)
                .search_by_fingerprint(molfile, current_user.id, collection_id,
                                       type, threshold)
        end

        scope = scope.by_collection_id(collection_id.to_i)

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
          optional :is_sync, type: Boolean
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          scope =
            scope_by_search_by_method_arg_and_collection_id(search_by_method,
                                                            arg,
                                                            params[:collection_id],
                                                            params[:is_sync])


          serialization_by_elements_and_page(elements_by_scope(scope),
                                             params[:page])

        end
      end

      namespace :samples do
        desc "Return samples and associated elements by search selection"
        params do
          optional :page, type: Integer
          requires :selection, type: Hash
          requires :collection_id, type: String
          optional :is_sync, type: Boolean
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          scope = Sample.search_by(search_by_method, arg)

          samples = scope.by_collection_id(params[:collection_id].to_i, params[:is_sync])

          serialization_by_elements_and_page(elements_by_scope(samples),
                                             params[:page])
        end
      end

      namespace :reactions do
        desc "Return reactions and associated elements by search selection"
        params do
          optional :page, type: Integer
          requires :selection, type: Hash
          requires :collection_id, type: String
          optional :is_sync, type: Boolean
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          scope = Reaction.search_by(search_by_method, arg)

          reactions = scope.by_collection_id(params[:collection_id].to_i, params[:is_sync])

          serialization_by_elements_and_page(elements_by_scope(reactions),
                                             params[:page])
        end
      end

      namespace :wellplates do
        desc "Return wellplates and associated elements by search selection"
        params do
          optional :page, type: Integer
          requires :selection, type: Hash
          requires :collection_id, type: String
          optional :is_sync, type: Boolean
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          scope = Wellplate.search_by(search_by_method, arg)

          wellplates = scope.by_collection_id(params[:collection_id].to_i, params[:is_sync])

          serialization_by_elements_and_page(elements_by_scope(wellplates),
                                             params[:page])
        end
      end

      namespace :screens do
        desc "Return wellplates and associated elements by search selection"
        params do
          optional :page, type: Integer
          requires :selection, type: Hash
          requires :collection_id, type: String
          optional :is_sync, type: Boolean
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          scope = Screen.search_by(search_by_method, arg)

          screens = scope.by_collection_id(params[:collection_id].to_i, params[:is_sync])

          serialization_by_elements_and_page(elements_by_scope(screens),
                                             params[:page])
        end
      end

    end
  end
end
