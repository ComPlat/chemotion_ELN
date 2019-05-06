module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO implement search cache?
    helpers CollectionHelpers
    helpers do
      params :search_params do
        optional :page, type: Integer
        requires :selection, type: Hash do
          optional :search_by_method, type: String # , values: %w[
            # advanced substring structure
            # screen_name wellplate_name reaction_name reaction_short_label
            # sample_name sample_short_label
            # sample_external_label sum_formula iupac_name inchistring cano_smiles
            # polymer_type
          #]
          optional :elementType, type: String, values: %w[
            All Samples Reactions Wellplates Screens all samples reactions wellplates screens
          ]
          optional :molfile, type: String
          optional :search_type, type: String, values: %w[similar sub]
          optional :tanimoto_threshold, type: Float
          optional :page_size, type: Integer
          optional :structure_search, type: Boolean
          optional :name, type: String
          optional :advanced_params, type: Array do
            optional :link, type: String, values: ['', 'AND', 'OR'], default: ''
            optional :match, type: String, values: ['=', 'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE'], default: 'LIKE'
            requires :field, type: Hash
            requires :value, type: String
          end
        end
        requires :collection_id, type: String
        optional :is_sync, type: Boolean
        optional :molecule_sort, type: Boolean, default: false
        optional :per_page, type: Integer, default: 7
        optional :is_public, type: Boolean, default: false
      end

      def page_size
        params[:per_page]
      end

      def pages(total_elements)
        total_elements.fdiv(page_size).ceil
      end

      def search_by_method
        params[:selection][:search_by_method]
      end

      def adv_params
        params[:selection][:advanced_params]
      end

      def sample_structure_search(c_id = @c_id, not_permitted = @dl_s && @dl_s < 1 )
        return Sample.none if not_permitted
        molfile = Fingerprint.standardized_molfile(params[:selection][:molfile])
        threshold = params[:selection][:tanimoto_threshold]

        # TODO implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        if params[:selection][:search_type] == 'similar'
          Sample.by_collection_id(c_id).search_by_fingerprint_sim(molfile,threshold)
        else
          Sample.by_collection_id(c_id).search_by_fingerprint_sub(molfile)
        end
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

      def advanced_search(c_id = @c_id, dl = @dl)
        query = ''
        cond_val = []
        tables = []

        adv_params.each do |filter|
          adv_field = filter['field'].to_h.merge(dl).symbolize_keys
          next unless whitelisted_table(**adv_field)
          next unless filter_with_detail_level(**adv_field)
          table = filter['field']['table']
          tables.push(table: table, ext_key: filter['field']['ext_key'])
          field = filter['field']['column']
          words = filter['value'].split(/,|(\r)?\n/).map!(&:strip)
          words = words.map { |e| "%#{e}%" } unless filter['match'] == '='

          conditions = words.collect { "#{table}.#{field} #{filter['match']} ? " }.join(' OR ')
          query = "#{query} #{filter['link']} (#{conditions}) "
          cond_val += words
        end

        scope = Sample.by_collection_id(c_id.to_i)
        tables.each do |table_info|
          table = table_info[:table]
          ext_key = table_info[:ext_key]
          next if table.casecmp('samples').zero?

          scope = if ext_key.nil?
                    scope = scope.joins("INNER JOIN #{table} ON "\
                                        "#{table}.sample_id = samples.id")
                  else
                    scope = scope.joins("INNER JOIN #{table} ON "\
                                        "samples.#{ext_key} = #{table}.id")
                  end
        end
        scope = scope.where([query] + cond_val)

        scope
      end

      def serialize_samples samples, page, search_method, molecule_sort
        return { data: [], size: 0 } if samples.empty?
        samples_size = samples.size
        samplelist = []
        sample_serializer_selector =
        lambda { |s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized }

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
          molecule_scope.each do |molecule|
            next if molecule.nil?
            samplesGroup = sample_scope.select {|v| v.molecule_id == molecule.id}
            samplesGroup = samplesGroup.sort { |x, y| y.updated_at <=> x.updated_at }
            samplesGroup.each do |sample|
            serialized_sample = sample_serializer_selector.call(sample)
            samplelist.push(serialized_sample)
            end
          end
          samplelist
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
            paging_samples.each do |sample|
              next if sample.nil?
              serialized_sample = ElementListPermissionProxy.new(current_user, sample, user_ids).serialized
              samplelist.push(serialized_sample)
            end
          else
            paging_samples.each do |sample|
              next if sample.nil?
              serialized_sample = sample_serializer_selector.call(sample)
              samplelist.push(serialized_sample)
            end
          end
          samplelist
        end

        return {
          data: samplelist,
          size: samples_size
        }

      end

      def serialization_by_elements_and_page(elements, page = 1, molecule_sort = false)
        samples = elements.fetch(:samples, [])
        reactions = elements.fetch(:reactions, [])
        wellplates = elements.fetch(:wellplates, [])
        screens = elements.fetch(:screens, [])
        samples_data = serialize_samples(samples, page, search_by_method, molecule_sort)
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
        klass = "WellplateListSerializer::Level#{@dl_wp}".constantize
        serialized_wellplates = Wellplate.includes(
          collections: :sync_collections_users,
          wells: :sample
        ).find(ids).map{ |s|
          klass.new(s,1).serializable_hash.deep_symbolize_keys
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
            perPage: page_size,
            ids: samples
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reactions.size,
            page: page,
            pages: pages(reactions.size),
            perPage: page_size,
            ids: reactions
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplates.size,
            page: page,
            pages: pages(wellplates.size),
            perPage: page_size,
            ids: wellplates
          },
          screens: {
            elements: serialized_screens,
            totalElements: screens.size,
            page: page,
            pages: pages(screens.size),
            perPage: page_size,
            ids: screens
          }
        }
      end

      # Generate search query
      def search_elements(c_id = @c_id, dl = @dl)
        search_method = search_by_method
        molecule_sort = params[:molecule_sort]
        arg = params[:selection][:name]
        return if !(search_method =~ /advanced|structure/) && !arg.presence
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
        when 'iupac_name', 'inchistring', 'inchikey', 'cano_smiles',
             'sample_name', 'sample_short_label'
          if dl_s > 0
            Sample.by_collection_id(c_id).order("samples.updated_at DESC")
                  .search_by(search_method, arg)
          else
            Sample.none
          end
        when 'reaction_name', 'reaction_short_label', 'reaction_status'
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
            AllElementSearch.new(arg).search_by_substring.by_collection_id(c_id, current_user)
          else
            AllElementSearch::Results.new(Sample.none)
          end
        when 'structure'
          sample_structure_search
        when 'advanced'
          advanced_search(c_id)
        end

        if search_method == 'advanced' && molecule_sort == false
          arg_value_str = adv_params.first['value'].split(/(\r)?\n|,/).map(&:strip)
                                    .select{ |s| !s.empty? }.join(',')
          return scope.order(
            "position(','||(#{adv_params.first['field']['column']}::text)||',' in ',#{arg_value_str},')"
          )
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
        case scope&.first
        when Sample
          elements[:samples] = scope&.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_sample_ids(scope&.map(&:id)).pluck(:id)
          ).uniq
          elements[:wellplates] = user_wellplates.by_sample_ids(scope&.map(&:id)).uniq.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).pluck(:id)
        when Reaction
          elements[:reactions] = scope&.pluck(:id)
          elements[:samples] = user_samples.by_reaction_ids(scope&.map(&:id)).pluck(:id).uniq
          elements[:wellplates] = user_wellplates.by_sample_ids(elements[:samples]).uniq.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).pluck(:id)
        when Wellplate
          elements[:wellplates] = scope&.pluck(:id)
          elements[:screens] = user_screens.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:samples] = user_samples.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_sample_ids(elements[:samples]).pluck(:id)
          ).uniq
        when Screen
          elements[:screens] = scope&.pluck(:id)
          elements[:wellplates] = user_wellplates.by_screen_ids(scope).uniq.pluck(:id)
          elements[:samples] = user_samples.by_wellplate_ids(elements[:wellplates]).uniq.pluck(:id)
          elements[:reactions] = (
            user_reactions.by_sample_ids(elements[:samples]).pluck(:id)
          ).uniq.pluck(:id)
        when AllElementSearch::Results
          # TODO check this samples_ids + molecules_ids ????
          elements[:samples] = (scope&.samples_ids + scope&.molecules_ids)

          elements[:reactions] = (
            scope&.reactions_ids +
            user_reactions.by_sample_ids(elements[:samples]).pluck(:id)
          ).uniq

          elements[:wellplates] = (
            scope&.wellplates_ids +
            user_wellplates.by_sample_ids(elements[:samples]).pluck(:id)
          ).uniq

          elements[:screens] = (
            scope&.screens_ids +
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
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          scope = search_elements(@c_id, @dl)
          return unless scope

          elements_ids = elements_by_scope(scope)

          serialization_by_elements_and_page(
            elements_ids,
            params[:page],
            params[:molecule_sort]
          )
        end
      end

      namespace :samples do
        desc "Return samples and associated elements by search selection"
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          samples =
            case search_by_method
            when 'structure'
              sample_structure_search
            else
              Sample.by_collection_id(@c_id).search_by(search_by_method, params[:selection][:name])
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
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          reactions =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search
              samples_ids = associated_samples.pluck(:id)

              reaction_ids = (
                ReactionsProductSample.get_reactions(samples_ids) +
                ReactionsStartingMaterialSample.get_reactions(samples_ids) +
                ReactionsReactantSample.get_reactions(samples_ids)
              ).compact.uniq
              Reaction.by_collection_id(@c_id).where(id: reaction_ids)
            else
              Reaction.by_collection_id(@c_id).search_by(search_by_method, params[:selection][:name])
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
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          wellplates =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search
              Wellplate.by_collection_id(@c_id).by_sample_ids(associated_samples.pluck(:id))
            else
              Wellplate.by_collection_id(@c_id).search_by(search_by_method, params[:selection][:name])
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
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          screens =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search
              well_ids = Wellplate.by_sample_ids(associated_samples.pluck(:id))
              Screen.by_collection_id(@c_id).by_wellplate_ids(well_ids)
            else
              Screen.by_collection_id(@c_id).search_by(search_by_method, params[:selection][:name])
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
