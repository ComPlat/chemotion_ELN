module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO implement search cache?
    helpers do
      def page_size
        params[:per_page] == nil ? 7 : params[:per_page].to_i
      end

      def pages(total_elements)
        total_elements.fdiv(page_size).ceil
      end

      def structure_search
        params[:selection].structure_search
      end

      def get_arg
        structure_search ? params[:selection].molfile : params[:selection].name
      end

      def get_search_method
        return params[:selection].search_by_method unless structure_search

        page_size = params[:per_page].to_i
        return 'structure'
      end

      def serialization_by_elements_and_page(elements, page = 1, moleculeSort = false)
        samples = elements.fetch(:samples, [])
        reactions = elements.fetch(:reactions, [])
        wellplates = elements.fetch(:wellplates, [])
        screens = elements.fetch(:screens, [])

        # After paging, now we can map to searchable for AllElementSearch
        samples = samples.map{ |e| e.is_a?(PgSearch::Document) ? e.searchable : e}.uniq
        reactions = reactions.map{ |e| e.is_a?(PgSearch::Document) ? e.searchable : e}.uniq
        wellplates = wellplates.map{ |e| e.is_a?(PgSearch::Document) ? e.searchable : e}.uniq
        screens = screens.map{ |e| e.is_a?(PgSearch::Document) ? e.searchable : e}.uniq

        samples_size = samples.size
        if samples.empty? == false
          if moleculeSort
            molecule_scope =
              Molecule.where(id: (samples.map(&:molecule_id)))
                      .order("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))")
                      .order(:sum_formular)
            samples_size = molecule_scope.size
            molecule_scope = molecule_scope.page(page).per(page_size)

            serialized_samples = {
              molecules: create_group_molecule(molecule_scope, samples)
            }
          else
            paging_samples = Kaminari.paginate_array(samples).page(page).per(page_size)
            paging_samples = paging_samples.map{ |e| e.is_a?(PgSearch::Document) ? e.searchable : e}.uniq
            serialized_samples = {
              molecules: group_by_molecule(paging_samples)
            }
          end
        end

        serialized_reactions = Kaminari.paginate_array(reactions).page(page)
          .per(page_size).map {|s|
            ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys
          }
        serialized_wellplates = Kaminari.paginate_array(wellplates).page(page)
          .per(page_size).map{ |s|
            WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys
          }
        serialized_screens = Kaminari.paginate_array(screens).page(page)
          .per(page_size).map{ |s|
            ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys
          }

        {
          samples: {
            elements: serialized_samples,
            totalElements: samples_size,
            page: page,
            pages: pages(samples_size),
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

      # Generate search query
      def scope_by_search_by_method_arg_and_collection_id(search_by_method,
          arg, collection_id, is_sync = false, molecule_sort = false)
        sample_search = false

        scope = case search_by_method
        when 'polymer_type'
          sample_search = true
          Sample.for_user(current_user.id).joins(:residues)
            .where("residues.custom_info -> 'polymer_type' ILIKE '%#{arg}%'")
        when 'sum_formula', 'iupac_name', 'inchistring', 'cano_smiles',
             'sample_name', 'sample_short_label', 'sample_external_label'
          sample_search = true
          Sample.for_user(current_user.id).search_by(search_by_method, arg)
        when 'reaction_name'
          Reaction.for_user(current_user.id).search_by(search_by_method, arg)
        when 'wellplate_name'
          Wellplate.for_user(current_user.id).search_by(search_by_method, arg)
        when 'screen_name'
          Screen.for_user(current_user.id).search_by(search_by_method, arg)
        when 'substring'
          all_element = AllElementSearch.new(arg, current_user.id).search_by_substring
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

        if sample_search
          scope =
            if molecule_sort
              scope.includes(:molecule)
                   .order("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))")
                   .order(:sum_formular)
            else
              scope.order("updated_at DESC")
            end
        end

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
          elements[:samples] = scope.samples + scope.molecules
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
          optional :molecule_sort, type: Integer
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()
          return if arg.to_s.strip.length == 0

          molecule_sort = params[:molecule_sort] == 1 ? true : false
          scope = scope_by_search_by_method_arg_and_collection_id(search_by_method,
            arg, params[:collection_id], params[:is_sync], molecule_sort)

          serialization_by_elements_and_page(elements_by_scope(scope),
            params[:page], molecule_sort)

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
