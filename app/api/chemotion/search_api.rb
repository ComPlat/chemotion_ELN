# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/ClassLength

# rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Lint/SafeNavigationChain, Style/RedundantParentheses

# rubocop:disable Naming/VariableName, Naming/MethodParameterName, Layout/LineLength

module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # TODO: implement search cache?
    helpers CollectionHelpers
    helpers do
      params :search_params do
        optional :page, type: Integer
        requires :selection, type: Hash do
          optional :search_by_method, type: String # , values: %w[
          #  advanced substring structure
          #  screen_name wellplate_name reaction_name reaction_short_label
          #  sample_name sample_short_label
          #  sample_external_label sum_formula iupac_name inchistring cano_smiles
          #  polymer_type
          # ]
          optional :elementType, type: String, values: %w[
            All Samples Reactions Wellplates Screens all samples reactions wellplates screens elements cell_lines by_ids advanced structure
          ]
          optional :molfile, type: String
          optional :search_type, type: String, values: %w[similar sub]
          optional :tanimoto_threshold, type: Float
          optional :page_size, type: Integer
          optional :structure_search, type: Boolean
          optional :name, type: String
          optional :advanced_params, type: Array do
            optional :link, type: String, values: ['', 'AND', 'OR'], default: ''
            optional :match, type: String, values: ['=', 'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE', '>', '<', '>=', '@>', '<@'], default: 'LIKE'
            optional :table, type: String, values: %w[samples reactions wellplates screens research_plans elements segments literatures]
            optional :element_id, type: Integer
            optional :unit, type: String
            requires :field, type: Hash
            requires :value, type: String
            optional :smiles, type: String
            optional :sub_values, type: Array
          end
          optional :id_params, type: Hash do
            requires :model_name, type: String, values: %w[
              sample reaction wellplate screen element research_plan
            ]
            requires :ids, type: Array
            optional :total_elements, type: Integer
            optional :with_filter, type: Boolean
          end
          optional :list_filter_params, type: Hash do
            optional :filter_created_at, type: Boolean
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :product_only, type: Boolean
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

      def id_params
        params[:selection][:id_params]
      end

      def list_filter_params
        params[:selection][:list_filter_params]
      end

      def sample_structure_search(c_id = @c_id, not_permitted = @dl_s && @dl_s < 1)
        return Sample.none if not_permitted

        molfile = Fingerprint.standardized_molfile(params[:selection][:molfile])
        threshold = params[:selection][:tanimoto_threshold]

        # TODO: implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        scope =
          if params[:selection][:search_type] == 'similar'
            Sample.by_collection_id(c_id).search_by_fingerprint_sim(molfile, threshold)
          else
            Sample.by_collection_id(c_id).search_by_fingerprint_sub(molfile)
          end
        order_by_molecule(scope)
      end

      def order_by_molecule(scope)
        scope.includes(:molecule)
             .joins(:molecule)
             .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
             .order('molecules.sum_formular')
      end

      def whitelisted_table(table:, column:, **_)
        return true if %w[elements segments chemicals containers measurements molecules].include?(table)

        API::WL_TABLES.key?(table) && API::WL_TABLES[table].include?(column)
      end

      # desc: return true if the detail level allow to access the column
      def filter_with_detail_level(table:, column:, sample_detail_level:, reaction_detail_level:, **_)
        # TODO: filter according to columns

        return true unless table.in?(%w[samples reactions])
        return true if table == 'samples' && (sample_detail_level.positive? || column == 'external_label')
        return true if table == 'reactions' && reaction_detail_level > -1

        false
      end

      def advanced_search(c_id = @c_id, dl = @dl)
        conditions = Usecases::Search::ConditionsForAdvancedSearch.new(
          detail_levels: dl,
          params: params[:selection][:advanced_params],
        ).filter!

        query_cond = conditions[:value].present? ? [conditions[:query]] + conditions[:value] : conditions[:query]
        scope = conditions[:model_name].by_collection_id(c_id.to_i)
                                       .where(query_cond)
                                       .joins(conditions[:joins].join(' '))
        scope = order_by_molecule(scope) if conditions[:model_name] == Sample
        scope = scope.group("#{conditions[:model_name].table_name}.id") if %w[ResearchPlan Wellplate].include?(conditions[:model_name].to_s)
        scope
      end

      def serialize_samples(sample_ids, page, molecule_sort)
        return { data: [], size: 0 } if sample_ids.empty?

        samples_size = sample_ids.size
        samplelist = []

        if molecule_sort == true
          # Sorting by molecule for non-advanced search
          molecule_scope =
            Molecule.joins(:samples).where(samples: { id: sample_ids })
                    .order(Arel.sql("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))"))
                    .order(:sum_formular)
          molecule_scope = molecule_scope.page(page).per(page_size)
          samples = Sample.includes_for_list_display.find(sample_ids)
          samples_size = molecule_scope.size
          molecule_scope.each do |molecule|
            samplesGroup = samples.select { |sample| sample.molecule_id == molecule.id }
            samplesGroup = samplesGroup.sort { |x, y| y.updated_at <=> x.updated_at }
            samplesGroup.each do |sample|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
              serialized_sample = Entities::SampleEntity.represent(
                sample,
                detail_levels: detail_levels,
                displayed_in_list: true,
              ).serializable_hash
              samplelist.push(serialized_sample)
            end
          end
        else
          id_array = Kaminari.paginate_array(sample_ids).page(page).per(page_size)
          ids = id_array.join(',')
          Sample.includes_for_list_display
                .where(id: id_array)
                .order(Arel.sql("position(','||id::text||',' in ',#{ids},')"))
                .each do |sample|
                  detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
                  serialized_sample = Entities::SampleEntity.represent(
                    sample,
                    detail_levels: detail_levels,
                    displayed_in_list: true,
                  ).serializable_hash
                  samplelist.push(serialized_sample)
                end
        end

        { data: samplelist, size: samples_size }
      end

      # rubocop:disable Style/OptionalBooleanParameter

      def serialization_by_elements_and_page(elements, page = 1, molecule_sort = false)
        element_ids = elements.fetch(:element_ids, [])
        reaction_ids = elements.fetch(:reaction_ids, [])
        sample_ids = elements.fetch(:sample_ids, [])
        samples_data = serialize_samples(sample_ids, page, molecule_sort)
        screen_ids = elements.fetch(:screen_ids, [])
        wellplate_ids = elements.fetch(:wellplate_ids, [])
        cell_line_ids = elements.fetch(:cell_line_ids, [])
        research_plan_ids = elements.fetch(:research_plan_ids, [])

        paginated_reaction_ids = Kaminari.paginate_array(reaction_ids).page(page).per(page_size)
        serialized_reactions = Reaction.find(paginated_reaction_ids).map do |reaction|
          Entities::ReactionEntity.represent(reaction, displayed_in_list: true).serializable_hash
        end

        paginated_wellplate_ids = Kaminari.paginate_array(wellplate_ids).page(page).per(page_size)
        serialized_wellplates = Wellplate.find(paginated_wellplate_ids).map do |wellplate|
          Entities::WellplateEntity.represent(wellplate, displayed_in_list: true).serializable_hash
        end

        paginated_screen_ids = Kaminari.paginate_array(screen_ids).page(page).per(page_size)
        serialized_screens = Screen.find(paginated_screen_ids).map do |screen|
          Entities::ScreenEntity.represent(screen, displayed_in_list: true).serializable_hash
        end

        paginated_cell_line_ids = Kaminari.paginate_array(cell_line_ids).page(page).per(page_size)
        serialized_cell_lines = CelllineSample.find(paginated_cell_line_ids).map do |cell_line|
          Entities::CellLineSampleEntity.represent(cell_line, displayed_in_list: true).serializable_hash
        end

        paginated_research_plan_ids = Kaminari.paginate_array(research_plan_ids).page(page).per(page_size)
        serialized_research_plans = ResearchPlan.find(paginated_research_plan_ids).map do |research_plan|
          Entities::ResearchPlanEntity.represent(research_plan, displayed_in_list: true).serializable_hash
        end

        result = {
          samples: {
            elements: samples_data[:data],
            totalElements: samples_data[:size],
            page: page,
            pages: pages(samples_data[:size]),
            perPage: page_size,
            ids: sample_ids,
          },
          reactions: {
            elements: serialized_reactions,
            totalElements: reaction_ids.size,
            page: page,
            pages: pages(reaction_ids.size),
            perPage: page_size,
            ids: reaction_ids,
          },
          wellplates: {
            elements: serialized_wellplates,
            totalElements: wellplate_ids.size,
            page: page,
            pages: pages(wellplate_ids.size),
            perPage: page_size,
            ids: wellplate_ids,
          },
          screens: {
            elements: serialized_screens,
            totalElements: screen_ids.size,
            page: page,
            pages: pages(screen_ids.size),
            perPage: page_size,
            ids: screen_ids,
          },
          cell_lines: {
            elements: serialized_cell_lines,
            totalElements: cell_line_ids.size,
            page: page,
            pages: pages(cell_line_ids.size),
            perPage: page_size,
            ids: cell_line_ids,
          },
          research_plans: {
            elements: serialized_research_plans,
            totalElements: research_plan_ids.size,
            page: page,
            pages: pages(research_plan_ids.size),
            perPage: page_size,
            ids: research_plan_ids,
          },
        }

        klasses = Labimotion::ElementKlass.where(is_active: true, is_generic: true)
        klasses.each do |klass|
          element_ids_for_klass = Labimotion::Element.where(id: element_ids, element_klass_id: klass.id).pluck(:id)
          paginated_element_ids = Kaminari.paginate_array(element_ids_for_klass).page(page).per(page_size)
          serialized_elements = Labimotion::Element.find(paginated_element_ids).map do |element|
            Labimotion::ElementEntity.represent(element, displayed_in_list: true).serializable_hash
          end

          result["#{klass.name}s"] = {
            elements: serialized_elements,
            totalElements: element_ids_for_klass.size,
            page: page,
            pages: pages(element_ids_for_klass.size),
            perPage: page_size,
            ids: element_ids_for_klass,
          }
        end
        result
      end

      # rubocop:enable Style/OptionalBooleanParameter

      # Generate search query
      def search_elements(c_id = @c_id, dl = @dl)
        search_method = search_by_method
        molecule_sort = params[:molecule_sort]
        arg = params[:selection][:name]
        return if (search_method !~ /advanced|structure/) && !arg.presence

        dl_s = dl[:sample_detail_level] || 0
        scope = case search_method
                when 'polymer_type'
                  if dl_s.positive?
                    Sample.by_collection_id(c_id).order('samples.updated_at DESC')
                          .by_residues_custom_info('polymer_type', arg)
                  else
                    Sample.none
                  end
                when 'sum_formula', 'sample_external_label'
                  if dl_s > -1
                    Sample.by_collection_id(c_id).order('samples.updated_at DESC')
                          .search_by(search_method, arg)
                  else
                    Sample.none
                  end
                when 'iupac_name', 'inchistring', 'inchikey', 'cano_smiles',
                     'sample_name', 'sample_short_label'
                  if dl_s.positive?
                    Sample.by_collection_id(c_id).order('samples.updated_at DESC')
                          .search_by(search_method, arg)
                  else
                    Sample.none
                  end
                when 'cas'
                  if dl_s.positive?
                    Sample.by_collection_id(c_id).order('samples.updated_at DESC')
                          .by_sample_xref_cas(arg)
                  else
                    Sample.none
                  end
                when 'reaction_name', 'reaction_short_label', 'reaction_status', 'reaction_rinchi_string'
                  Reaction.by_collection_id(c_id).search_by(search_method, arg)
                when 'wellplate_name'
                  Wellplate.by_collection_id(c_id).search_by(search_method, arg)
                when 'screen_name'
                  Screen.by_collection_id(c_id).search_by(search_method, arg)
                when 'substring'
                  # NB we'll have to split the content of the pg_search_document into
                  # MW + external_label (dl_s = 0) and the other info only available
                  # from dl_s > 0. For now one can use the suggested search instead.
                  if dl_s.positive?
                    AllElementSearch.new(arg).search_by_substring.by_collection_id(c_id, current_user)
                  else
                    AllElementSearch::Results.new(Sample.none)
                  end
                when 'structure'
                  sample_structure_search
                when 'advanced'
                  advanced_search(c_id)
                when 'cell_line_material_name'
                  CelllineSample.by_material_name(arg, c_id)
                when 'cell_line_sample_name'
                  CelllineSample.by_sample_name(arg, c_id)
                end

        if search_method != 'advanced' && search_method != 'structure' && molecule_sort == true
          scope.includes(:molecule)
               .joins(:molecule)
               .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
               .order('molecules.sum_formular')
        elsif search_by_method.start_with?('element_short_label_')
          klass = Labimotion::ElementKlass.find_by(name: search_by_method.sub('element_short_label_', ''))
          return Labimotion::Element.by_collection_id(c_id).by_klass_id_short_label(klass.id, arg)
        end
        scope
      end

      def elements_by_scope(scope, collection_id = @c_id)
        elements = {}
        user_samples = Sample.by_collection_id(collection_id)
        user_reactions = Reaction.by_collection_id(collection_id)
        user_wellplates = Wellplate.by_collection_id(collection_id)
        user_screens = Screen.by_collection_id(collection_id)
        user_research_plans = ResearchPlan.by_collection_id(collection_id)
        user_elements = Labimotion::Element.by_collection_id(collection_id)

        case scope&.first
        when Sample
          elements[:sample_ids] = scope&.ids
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:wellplate_ids] = user_wellplates.by_sample_ids(elements[:sample_ids]).uniq.pluck(:id)
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when Reaction
          elements[:reaction_ids] = scope&.ids
          elements[:sample_ids] = user_samples.by_reaction_ids(elements[:reaction_ids]).pluck(:id).uniq
          elements[:wellplate_ids] = user_wellplates.by_sample_ids(elements[:sample_ids]).uniq.pluck(:id)
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_reaction_ids(elements[:reaction_ids]).pluck(:id).uniq
        when Wellplate
          elements[:wellplate_ids] = scope&.ids
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:sample_ids] = user_samples.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = ResearchPlansWellplate.get_research_plans(elements[:wellplate_ids]).uniq
          # elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when Screen
          elements[:screen_ids] = scope&.ids
          elements[:wellplate_ids] = user_wellplates.by_screen_ids(elements[:screen_ids]).uniq.pluck(:id)
          elements[:sample_ids] = user_samples.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when ResearchPlan
          elements[:research_plan_ids] = scope&.ids
          sample_ids = ResearchPlan.sample_ids_by_research_plan_ids(elements[:research_plan_ids])
          reaction_ids = ResearchPlan.reaction_ids_by_research_plan_ids(elements[:research_plan_ids])
          elements[:sample_ids] = sample_ids.map(&:sample_id).uniq
          elements[:reaction_ids] = reaction_ids.map(&:reaction_id).uniq
          elements[:wellplate_ids] = ResearchPlansWellplate.get_wellplates(elements[:research_plan_ids]).uniq
        when Labimotion::Element
          elements[:element_ids] = scope&.ids
          sids = Labimotion::ElementsSample.where(element_id: elements[:element_ids]).pluck(:sample_id)
          elements[:sample_ids] = Sample.by_collection_id(collection_id).where(id: sids).uniq.pluck(:id)
        when AllElementSearch::Results
          # TODO: check this samples_ids + molecules_ids ????
          elements[:sample_ids] = (scope&.samples_ids + scope&.molecules_ids)
          elements[:reaction_ids] = (
            scope&.reactions_ids +
            user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id)
          ).uniq

          elements[:wellplate_ids] = (
            scope&.wellplates_ids +
            user_wellplates.by_sample_ids(elements[:sample_ids]).pluck(:id)
          ).uniq

          elements[:screen_ids] = (
            scope&.screens_ids +
            user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id)
          ).uniq

          elements[:element_ids] = (scope&.element_ids).uniq
        when CelllineSample
          elements[:cell_line_ids] = scope&.ids
        end
        elements
      end
    end

    resource :search do
      namespace :cell_lines do
        desc 'Return all matched cell lines and associations for substring query'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          query = @params[:selection][:name]
          collection_id = @params[:collection_id]
          cell_lines =
            case search_by_method
            when 'cell_line_material_name'
              CelllineSample.by_material_name(query, collection_id)
            when 'cell_line_sample_name'
              CelllineSample.by_sample_name(query, collection_id)
            end

          return unless cell_lines

          elements_ids = elements_by_scope(cell_lines)

          serialization_by_elements_and_page(
            elements_ids,
            params[:page],
            params[:molecule_sort],
          )
        end
      end

      namespace :all do
        desc 'Return all matched elements and associations for substring query'
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
            params[:molecule_sort],
          )
        end
      end

      namespace :structure do
        desc 'Return all matched elements and associations for structure search'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          Usecases::Search::StructureSearch.new(
            collection_id: @c_id,
            params: params,
            user: current_user,
            detail_levels: @dl,
          ).perform!
        end
      end

      namespace :advanced do
        desc 'Return all matched elements and associations for advanced / detail search'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          conditions =
            Usecases::Search::ConditionsForAdvancedSearch.new(
              detail_levels: @dl,
              params: params[:selection][:advanced_params],
            ).filter!

          results = Usecases::Search::AdvancedSearch.new(
            collection_id: @c_id,
            params: params,
            user: current_user,
            conditions: conditions,
          ).perform!

          results['cell_lines'] = { elements: [], ids: [], page: 1, perPage: 15, pages: 0, totalElements: 0, error: '' }
          results
        end
      end

      namespace :by_ids do
        desc 'Return elements by ids'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          Usecases::Search::ByIds.new(
            collection_id: @c_id,
            params: params,
            user: current_user,
          ).perform!
        end
      end

      namespace :samples do
        desc 'Return samples and associated elements by search selection'
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
            when 'cas'
              Sample.by_collection_id(@c_id).by_sample_xref_cas(params[:selection][:name])
            else
              Sample.by_collection_id(@c_id).search_by(search_by_method, params[:selection][:name])
            end

          serialization_by_elements_and_page(
            elements_by_scope(samples),
            params[:page],
          )
        end
      end

      namespace :reactions do
        desc 'Return reactions and associated elements by search selection'
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
            params[:page],
          )
        end
      end

      namespace :wellplates do
        desc 'Return wellplates and associated elements by search selection'
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
            params[:page],
          )
        end
      end

      namespace :screens do
        desc 'Return screens and associated elements by search selection'
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
            params[:page],
          )
        end
      end
    end
  end
end

# rubocop:enable Naming/VariableName, Naming/MethodParameterName, Layout/LineLength

# rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Lint/SafeNavigationChain, Style/RedundantParentheses

# rubocop:enable Metrics/MethodLength, Metrics/AbcSize, Metrics/ClassLength
