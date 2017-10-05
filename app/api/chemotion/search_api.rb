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
        'structure'
      end

      def latest_updated
        [
          Sample.maximum(:updated_at),
          Reaction.maximum(:updated_at),
          Wellplate.maximum(:updated_at),
          Screen.maximum(:updated_at),
          ResearchPlan.maximum(:updated_at)
        ].max
      end

      def sample_structure_search(arg, c_id = @c_id, not_permitted = @dl_s && @dl_s < 1 )
        return Sample.none if not_permitted
        molfile = Fingerprint.standardized_molfile arg
        threshold = params[:selection].tanimoto_threshold
        type = params[:selection].search_type

        # TODO implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        Sample.by_collection_id(c_id)
              .search_by_fingerprint(
                molfile, current_user.id, c_id, type, threshold
              )
      end

      def whitelisted_table(table:, column:, **_)
        API::WL_TABLES.has_key?(table) && API::WL_TABLES[table].include?(column)
      end

      # desc: return true if the detail level allow to access the column
      def filter_with_detail_level(table:, column:, sample_detail_level:,
        reaction_detail_level:,  **_)
        # TODO filter according to columns
        case table
        when 'samples'
          if sample_detail_level > 0
            true
          elsif column == 'external_label'
            true
          else
            false
          end
        when 'reactions'
          if reaction_detail_level > -1
            true
          else
            false
          end
        else
          true
        end
      end

      def advanced_search(arg, c_id = @c_id, dl = @dl)
        query = ''
        cond_val = []
        tables = []

        arg.each do |filter|
          adv_field = filter.field.to_h.merge(dl).symbolize_keys
          next unless whitelisted_table(**adv_field)
          next unless filter_with_detail_level(**adv_field)
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

        scope = Sample.by_collection_id(c_id.to_i)
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
          id_array = Kaminari.paginate_array(samples).page(page).per(page_size)
          ids = id_array.join(',')
          paging_samples = Sample.includes(
            :residues, :tag,
            collections: :sync_collections_users,
            molecule: :tag
          ).where(
            id: id_array
          ).order("position(','||id::text||',' in ',#{ids},')").to_a

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
      def search_elements(search_method, arg, c_id = @c_id,
                          molecule_sort = false, dl = @dl)
        dl_s = dl[:sample_detail_level] || 0
        scope = case search_method
        when 'polymer_type'
          if dl_s > 0
            Sample.by_collection_id(c_id).order("samples.updated_at DESC")
                  .joins(:residues)
                  .where("residues.custom_info -> 'polymer_type' ILIKE '%#{arg}%'")
          else
            Sample.none
          end
        when 'sum_formula', 'sample_external_label'
          if dl_s > -1
            Sample.by_collection_id(c_id).order("samples.updated_at DESC")
                  .search_by(search_method, arg)
          else
            Sample.none
          end
        when 'iupac_name', 'inchistring', 'cano_smiles',
             'sample_name', 'sample_short_label'
          if dl_s > 0
            Sample.by_collection_id(c_id).order("samples.updated_at DESC")
                  .search_by(search_method, arg)
          else
            Sample.none
          end
        when 'reaction_name', 'reaction_short_label'
          Reaction.by_collection_id(c_id).search_by(search_method, arg)
        when 'wellplate_name'
          Wellplate.by_collection_id(c_id).search_by(search_method, arg)
        when 'screen_name'
          Screen.by_collection_id(c_id).search_by(search_method, arg)
        when 'substring'
          # NB we'll have to split the content of the pg_search_document into
          # MW + external_label (dl_s = 0) and the other info only available
          # from dl_s > 0. For now one can use the suggested search instead.
          if dl_s > 0
            AllElementSearch.new(
              arg,
              current_user.id
            ).search_by_substring.by_collection_id(c_id)
          else
            AllElementSearch::Results.new(Sample.none,current_user.id)
          end
        when 'structure'
            sample_structure_search(arg)
        when 'advanced'
          advanced_search(arg, c_id)
        end

        if search_method == 'advanced' && molecule_sort == false
          arg_value_str = arg.first.value.gsub(/(\r)?\n/, ",")
          return scope.order('position(\',\'||(' + arg.first.field.column +
                             "::text)||\',\' in ',#{arg_value_str},')")
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

      def elements_by_scope(scope, collection_id = @c_id)
        return {} if scope.empty?

        elements = {}

        user_samples = Sample.by_collection_id(collection_id)
          .includes(molecule: :tag)
        user_reactions = Reaction.by_collection_id(collection_id).includes(
          :literatures, :tag,
          reactions_starting_material_samples: :sample,
          reactions_solvent_samples: :sample,
          reactions_reactant_samples: :sample,
          reactions_product_samples: :sample,
        )
        user_wellplates = Wellplate.by_collection_id(collection_id).includes(
          wells: :sample
        )
        user_screens = Screen.by_collection_id(collection_id)
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
          # TODO check this samples_ids + molecules_ids ????
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

      def set_var
        @c_id = fetch_collection_id_w_current_user(
          params[:collection_id], params[:is_sync]
        )
        @dl = permission_level_for_collection(
          params[:collection_id], params[:isSync]
        )
        @dl_s = @dl[:sample_detail_level]
        @dl_r = @dl[:reaction_detail_level]
        @dl_wp = @dl[:wellplate_detail_level]
        @dl_sc = @dl[:screen_detail_level]
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

        after_validation do
          set_var
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

          scope = search_elements(search_by_method, arg, @c_id, molecule_sort, @dl)

          elements_ids = elements_by_scope(scope)

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

        after_validation do
          set_var
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()
          samples =
            case search_by_method
            when 'structure'
              sample_structure_search(arg)
            else
              Sample.by_collection_id(@c_id).search_by(search_by_method, arg)
            end

          serialization_by_elements_and_page(
            elements_by_scope(samples),
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

        after_validation do
          set_var
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          reactions =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              samples_ids = associated_samples.pluck(:id)

              reaction_ids = (
                ReactionsProductSample.get_reactions(samples_ids) +
                ReactionsStartingMaterialSample.get_reactions(samples_ids) +
                ReactionsReactantSample.get_reactions(samples_ids)
              ).compact.uniq
              Reaction.by_collection_id(@c_id).where(id: reaction_ids)
            else
              Reaction.by_collection_id(@c_id).search_by(search_by_method, arg)
            end

          serialization_by_elements_and_page(
            elements_by_scope(reactions),
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

        after_validation do
          set_var
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          wellplates =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              Wellplate.by_collection_id(@c_id).by_sample_ids(associated_samples.pluck(:id))
            else
              Wellplate.by_collection_id(@c_id).search_by(search_by_method, arg)
            end

          serialization_by_elements_and_page(
            elements_by_scope(wellplates),
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

        after_validation do
          set_var
        end

        post do
          search_by_method = get_search_method()
          arg = get_arg()

          screens =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search(arg)
              well_ids = Wellplate.by_sample_ids(associated_samples.pluck(:id))
              Screen.by_collection_id(@c_id).by_wellplate_ids(well_ids)
            else
              Screen.by_collection_id(@c_id).search_by(search_by_method, arg)
            end

          serialization_by_elements_and_page(
            elements_by_scope(screens),
            params[:page]
          )
        end
      end
    end
  end
end
