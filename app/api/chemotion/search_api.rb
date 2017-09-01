module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO implement search cache?
    helpers SyncHelpers
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

        # page_size = params[:per_page].to_i
        return 'structure'
      end

      def latest_updated
        latest_updated = [
          Sample.maximum(:updated_at),
          Reaction.maximum(:updated_at),
          Wellplate.maximum(:updated_at),
          Screen.maximum(:updated_at),
          ResearchPlan.maximum(:updated_at)
        ].max

        return latest_updated
      end

      def sample_structure_search arg
        molfile = Fingerprint.standardized_molfile arg
        threshold = params[:selection].tanimoto_threshold
        type = params[:selection].search_type

        # TODO implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        Sample.for_user(current_user.id)
              .search_by_fingerprint(molfile, current_user.id,
                params[:collection_id].to_i, type, threshold)
      end

      def whitelisted_table(table:, column:, **_)
        API::WL_TABLES.has_key?(table) && API::WL_TABLES[table].include?(column)
      end

      def advanced_search arg
        query = ''
        cond_val = []
        tables = []

        arg.each do |filter|
          next unless whitelisted_table(filter.field.to_h.symbolize_keys)
          table = filter.field.table
          tables.push(table)
          field = filter.field.column
          words = filter.value.split(/,|(\r)?\n/).map!(&:strip)

          if filter.match.casecmp('exact').zero?
            match = '='
          else
            match = 'LIKE'
            words = words.map { |e| "%#{e}%" }
          end

          conditions = words.collect {
            table + '.' + field + ' ' + match + ' ? '
          }.join(' OR ')

          query = query + ' ' + filter.link + ' (' + conditions + ') '
          cond_val += words
        end

        scope = Sample.for_user(current_user.id)
        tables.each do |table|
          if table.casecmp('samples') != 0
            scope = scope.joins("INNER JOIN #{table} ON "\
                                "#{table}.sample_id = samples.id")
          end
        end
        scope = scope.where([query] + cond_val)

        scope
      end

      def serialize_samples samples, page, search_method, molecule_sort
        return { data: [], size: 0 } if samples.empty?

        samples_size = samples.size

        if search_method != 'advanced' && molecule_sort == true
          # Sorting by molecule for non-advanced search
          molecule_scope =
            Molecule.joins(:samples).where('samples.id IN (?)', samples)
                    .order("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))")
                    .order(:sum_formular)
          molecule_scope = molecule_scope.page(page).per(page_size).includes(
            :tag, collections: :sync_collections_users
          )
          sample_scope = Sample.includes(
            :residues, :molecule, :tag, :container
          ).find(samples)
          samples_size = molecule_scope.size

          serialized_samples = {
            molecules: create_group_molecule(molecule_scope, sample_scope)
          }
        else
          ids = Kaminari.paginate_array(samples).page(page).per(page_size)
          paging_samples = Sample.includes(
            :residues, :tag,
            collections: :sync_collections_users,
            molecule: :tag
          ).where(id: ids).order("position(id::text in '#{ids}')").to_a

          if search_method == 'advanced'
            # sort by order - advanced search
            group_molecule = group_by_order(paging_samples)
          else
            group_molecule = group_by_molecule(paging_samples)
          end

          serialized_samples = {
            molecules: group_molecule
          }
        end

        return {
          data: serialized_samples,
          size: samples_size
        }

      end

      def serialization_by_elements_and_page(elements, page = 1, molecule_sort = false)
        samples = elements.fetch(:samples, [])
        reactions = elements.fetch(:reactions, [])
        wellplates = elements.fetch(:wellplates, [])
        screens = elements.fetch(:screens, [])

        search_method = get_search_method()
        samples_data = serialize_samples(samples, page, search_method, molecule_sort)
        serialized_samples = samples_data[:data]
        samples_size = samples_data[:size]

        ids = Kaminari.paginate_array(reactions).page(page).per(page_size)
        serialized_reactions = Reaction.includes(
          :literatures, :tag,
          reactions_starting_material_samples: :sample,
          reactions_solvent_samples: :sample,
          reactions_reactant_samples: :sample,
          reactions_product_samples: :sample,
          container: :attachments
        ).find(ids).map {|s|
          ReactionSerializer.new(s).serializable_hash.deep_symbolize_keys
        }

        ids = Kaminari.paginate_array(wellplates).page(page).per(page_size)
        serialized_wellplates = Wellplate.includes(
          collections: :sync_collections_users,
          wells: :sample
        ).find(ids).map{ |s|
          WellplateSerializer.new(s).serializable_hash.deep_symbolize_keys
        }

        ids = Kaminari.paginate_array(screens).page(page).per(page_size)
        serialized_screens = Screen.includes(
          collections: :sync_collections_users
        ).find(ids).map{ |s|
          ScreenSerializer.new(s).serializable_hash.deep_symbolize_keys
        }

        {
          samples: {
            elements: serialized_samples,
            totalElements: samples_size,
            page: page,
            pages: pages(samples_size),
            per_page: page_size,
            ids: samples
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reactions.size,
            page: page,
            pages: pages(reactions.size),
            per_page: page_size,
            ids: reactions
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplates.size,
            page: page,
            pages: pages(wellplates.size),
            per_page: page_size,
            ids: wellplates
          },
          screens: {
            elements: serialized_screens,
            totalElements: screens.size,
            page: page,
            pages: pages(screens.size),
            per_page: page_size,
            ids: screens
          }
        }
      end

      # Generate search query
      def search_elements(search_method, arg, collection_id,
                          molecule_sort = false)
        scope = case search_method
        when 'polymer_type'
          Sample.order("samples.updated_at DESC")
                .for_user(current_user.id).joins(:residues)
                .where("residues.custom_info -> 'polymer_type' ILIKE '%#{arg}%'")
        when 'sum_formula', 'iupac_name', 'inchistring', 'cano_smiles',
             'sample_name', 'sample_short_label', 'sample_external_label'
          Sample.order("samples.updated_at DESC")
                .for_user(current_user.id).search_by(search_method, arg)
        when 'reaction_name', 'reaction_short_label'
          Reaction.for_user(current_user.id).search_by(search_method, arg)
        when 'wellplate_name'
          Wellplate.for_user(current_user.id).search_by(search_method, arg)
        when 'screen_name'
          Screen.for_user(current_user.id).search_by(search_method, arg)
        when 'substring'
          AllElementSearch.new(
            arg,
            current_user.id
          ).search_by_substring
        when 'structure'
          sample_structure_search(arg)
        when 'advanced'
          advanced_search(arg)
        end

        scope = scope.by_collection_id(collection_id.to_i)

        if search_method == 'advanced' && molecule_sort == false
          arg_value_str = arg.first.value.gsub(/(\r)?\n/, ",")
          return scope.order('position(\',\'||' + arg.first.field.column +
                             "::text||\',\' in ',#{arg_value_str},')")
        elsif search_method == 'advanced' && molecule_sort == true
          return scope.order('samples.updated_at DESC')
        elsif search_method != 'advanced' && molecule_sort == true
          return scope.includes(:molecule)
                      .joins(:molecule)
                      .order(
                        "LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"
                      ).order('molecules.sum_formular')
        end

        return scope
      end

      def elements_by_scope(scope, collection_id)
        return {} if scope.empty?

        elements = {}

        user_samples = Sample.for_user(current_user.id)
          .by_collection_id(collection_id).includes(molecule: :tag)
        user_reactions = Reaction.for_user(current_user.id)
          .by_collection_id(collection_id).includes(
            :literatures, :tag,
            reactions_starting_material_samples: :sample,
            reactions_solvent_samples: :sample,
            reactions_reactant_samples: :sample,
            reactions_product_samples: :sample,
          )
        user_wellplates = Wellplate.for_user(current_user.id)
          .by_collection_id(collection_id).includes(
            wells: :sample
          )
        user_screens = Screen.for_user(current_user.id)
          .by_collection_id(collection_id)

        case scope.first
        when Sample
          elements[:samples] = scope.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_material_ids(scope.map(&:id)).pluck(:id) +
            user_reactions.by_reactant_ids(scope.map(&:id)).pluck(:id) +
            user_reactions.by_product_ids(scope.map(&:id)).pluck(:id)
          ).uniq
          elements[:wellplates] = user_wellplates.by_sample_ids(scope.map(&:id)).uniq.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).pluck(:id)
        when Reaction
          elements[:reactions] = scope.pluck(:id)
          elements[:samples] = (
            user_samples.by_reaction_reactant_ids(scope.map(&:id)).pluck(:id) +
            user_samples.by_reaction_product_ids(scope.map(&:id)).pluck(:id) +
            user_samples.by_reaction_material_ids(scope.map(&:id)).pluck(:id)
          ).uniq
          elements[:wellplates] = user_wellplates.by_sample_ids(elements[:samples]).uniq.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).pluck(:id)
        when Wellplate
          elements[:wellplates] = scope.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:samples] = user_samples.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_material_ids(elements[:samples]).pluck(:id) +
            user_reactions.by_reactant_ids(elements[:samples]).pluck(:id) +
            user_reactions.by_product_ids(elements[:samples]).pluck(:id)
          ).uniq
        when Screen
          elements[:screens] = scope.pluck(:id)
          elements[:wellplates] = user_wellplates.by_screen_ids(scope).uniq.pluck(:id)
          elements[:samples] = user_samples.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_material_ids(elements[:samples]).pluck(:id) +
            user_reactions.by_reactant_ids(elements[:samples]).pluck(:id) +
            user_reactions.by_product_ids(elements[:samples]).pluck(:id)
          ).uniq.pluck(:id)
        when AllElementSearch::Results
          elements[:samples] = (scope.samples_ids + scope.molecules_ids)

          elements[:reactions] = (
            scope.reactions_ids +
            (
              user_reactions.by_material_ids(elements[:samples]).pluck(:id) +
              user_reactions.by_reactant_ids(elements[:samples]).pluck(:id) +
              user_reactions.by_product_ids(elements[:samples]).pluck(:id)
            )
          ).uniq

          elements[:wellplates] = (
            scope.wellplates_ids +
            user_wellplates.by_sample_ids(elements[:samples]).pluck(:id)
          ).uniq

          elements[:screens] = (
            scope.screens_ids +
            user_screens.by_wellplate_ids(elements[:wellplates]).pluck(:id)
          ).uniq
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

          # molfile = Fingerprint.standardized_molfile arg
          # opt = [latest_updated, "search-all"]
          # cache_key = cache_key(search_by_method, arg, molfile,
          #   params[:collection_id], molecule_sort, opt)

          c_id = fetch_collection_id(params[:collection_id], params[:is_sync])

          scope = search_elements(search_by_method, arg, c_id, molecule_sort)

          elements_ids = elements_by_scope(scope, c_id)

          serialization_by_elements_and_page(
            elements_ids,
            params[:page], molecule_sort
          )
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

          scope =
            case search_by_method
            when 'structure'
              sample_structure_search(arg)
            else
              Sample.search_by(search_by_method, arg)
            end
          c_id = fetch_collection_id(params[:collection_id], params[:is_sync])
          samples = scope.by_collection_id(c_id)

          serialization_by_elements_and_page(
            elements_by_scope(samples, c_id),
            params[:page]
          )
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

          scope =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              samples_ids = associated_samples.pluck(:id)

              reaction_ids = (
                ReactionsProductSample.get_reactions(samples_ids) +
                ReactionsStartingMaterialSample.get_reactions(samples_ids) +
                ReactionsReactantSample.get_reactions(samples_ids)
              ).compact.uniq
              Reaction.where(id: reaction_ids)
            else
              Reaction.search_by(search_by_method, arg)
            end
          c_id = fetch_collection_id(params[:collection_id], params[:is_sync])
          reactions = scope.by_collection_id(c_id)

          serialization_by_elements_and_page(
            elements_by_scope(reactions, c_id),
            params[:page]
          )
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

          scope =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              Wellplate.by_sample_ids(associated_samples.pluck(:id))
            else
              Wellplate.search_by(search_by_method, arg)
            end
          c_id = fetch_collection_id(params[:collection_id], params[:is_sync])
          wellplates = scope.by_collection_id(c_id)

          serialization_by_elements_and_page(
            elements_by_scope(wellplates, c_id),
            params[:page]
          )
        end
      end

      namespace :screens do
        desc "Return screens and associated elements by search selection"
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
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              well_ids = Wellplate.by_sample_ids(associated_samples.pluck(:id))
              Screen.by_wellplate_ids(well_ids)
            else
              Screen.search_by(search_by_method, arg)
            end
          c_id = fetch_collection_id(params[:collection_id], params[:is_sync])
          screens = scope.by_collection_id(c_id)

          serialization_by_elements_and_page(
            elements_by_scope(screens, c_id),
            params[:page]
          )
        end
      end
    end
  end
end
