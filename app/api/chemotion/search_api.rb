# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength, Metrics/BlockLength, Metrics/AbcSize, Metrics/ClassLength

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
            All Samples Reactions Wellplates Screens all samples reactions wellplates screens elements by_ids
          ]
          optional :molfile, type: String
          optional :search_type, type: String, values: %w[similar sub]
          optional :tanimoto_threshold, type: Float
          optional :page_size, type: Integer
          optional :structure_search, type: Boolean
          optional :name, type: String
          optional :advanced_params, type: Array do
            optional :link, type: String, values: ['', 'AND', 'OR'], default: ''
            optional :match, type: String, values: ['=', 'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE', '>', '<'], default: 'LIKE'
            optional :table, type: String, values: %w[samples reactions wellplates screens research_plans elements]
            optional :element_id, type: Integer
            optional :unit, type: String, values: ['', '°C', '°F', 'K', 'Hour(s)', 'Minute(s)', 'Second(s)', 'Week(s)', 'Day(s)']
            requires :field, type: Hash
            requires :value, type: String
          end
          optional :id_params, type: Hash do
            requires :model_name, type: String, values: %w[
              sample reaction wellplate screen element
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
        # return true if table == 'elements'

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

      def duration_interval_by_unit(unit)
        case unit
        # when 'Hour(s)' then 3600
        when 'Minute(s)' then 60
        when 'Second(s)' then 1
        when 'Week(s)' then 604_800
        when 'Day(s)' then 86_400
        else
          3600
        end
      end

      def sanitize_words(filter)
        no_sanitizing_columns = %w[temperature duration]
        sanitize = filter['match'] != '=' && no_sanitizing_columns.exclude?(filter['field']['column'])
        words = filter['value'].split(/(\r)?\n/).map!(&:strip)
        words = words.map { |e| "%#{ActiveRecord::Base.send(:sanitize_sql_like, e)}%" } if sanitize
        words
      end

      def filter_values_for_advanced_search(dl = @dl)
        query = ''
        cond_val = []
        model_name = ''
        joins = []

        adv_params.each do |filter|
          filter['field']['table'] = filter['table']
          adv_field = filter['field'].to_h.merge(dl).symbolize_keys
          additional_condition = ''
          first_condition = ''
          next unless whitelisted_table(**adv_field)
          next unless filter_with_detail_level(**adv_field)

          table = filter['table']
          condition_table = "#{table}."
          model_name = table.singularize.camelize.constantize

          field = filter['field']['column']
          field = "xref ->> 'cas'" if field == 'xref' && filter['field']['opt'] == 'cas'
          additional_condition = "AND element_klass_id = #{filter['element_id']}" if table == 'elements' && filter['element_id'] != 0
          words = sanitize_words(filter)

          case filter['field']['column']
          when 'body'
            joins << 'CROSS JOIN jsonb_array_elements(body) AS element'
            joins << "CROSS JOIN jsonb_array_elements(element -> 'value' -> 'ops') AS ops"
            field = "(ops ->> 'insert')::TEXT"
            condition_table = ''
          when 'content'
            joins << "INNER JOIN private_notes ON private_notes.noteable_type = '#{model_name}' AND private_notes.noteable_id = #{table}.id"
            condition_table = 'private_notes.'
          when 'temperature'
            field = "(#{table}.temperature ->> 'userText')::FLOAT"
            first_condition = "(#{table}.temperature ->> 'userText')::TEXT != ''"
            first_condition += " AND (#{table}.temperature ->> 'valueUnit')::TEXT != '' AND "
            additional_condition = "AND (#{table}.temperature ->> 'valueUnit')::TEXT = '#{filter['unit']}'"
            words[0] = words.first.to_f
            condition_table = ''
          when 'duration'
            field = "(EXTRACT(epoch FROM #{table}.duration::interval)/#{duration_interval_by_unit(filter['unit'])})::INT"
            first_condition = "#{table}.duration IS NOT NULL AND #{table}.duration != '' AND "
            words[0] = words.first.to_i
            condition_table = ''
          when 'readout_titles'
            joins << 'CROSS JOIN jsonb_array_elements(readout_titles) AS titles'
            field = 'titles::TEXT'
            condition_table = ''
          end

          conditions = words.collect { "#{first_condition}#{condition_table}#{field} #{filter['match']} ? #{additional_condition}" }.join(' OR ')
          query = "#{query} #{filter['link']} (#{conditions}) "
          cond_val += words
        end
        [query, cond_val, model_name, joins]
      end

      def advanced_search(c_id = @c_id, dl = @dl)
        query, cond_val, model_name, joins = filter_values_for_advanced_search(dl)
        scope = model_name.by_collection_id(c_id.to_i)
                          .where([query] + cond_val)
                          .joins(joins.join(' '))
        scope = order_by_molecule(scope) if model_name == Sample
        scope = scope.group("#{model_name.table_name}.id") if %w[ResearchPlan Wellplate].include?(model_name.to_s)
        scope
      end

      def elements_search(c_id = @c_id, dl = @dl)
        Labimotion::Search.elements_search(params, current_user, c_id, dl)
      end

      # rubocop:enable Lint/SymbolConversion, Style/CaseLikeIf, Style/NumericPredicate, Style/ZeroLengthPredicate, Style/HashEachMethods

      def ids_by_params
        return id_params[:ids] if !id_params[:with_filter] || list_filter_params.present? || params[:molecule_sort]

        start_number = params[:page].to_i > pages(id_params[:total_elements]) ? 0 : params[:page_size].to_i * (params[:page].to_i - 1)
        id_params[:ids][start_number, start_number + params[:page_size].to_i]
      end

      def search_by_ids(c_id = @c_id)
        # TODO: generic elements
        model = id_params[:model_name].camelize.constantize
        scope =
          if id_params[:model_name] == 'sample'
            search_by_ids_for_sample(c_id, model, ids_by_params)
          else
            model
              .by_collection_id(c_id.to_i)
              .where(id: ids_by_params)
          end
        search_filter_scope(scope)
      end

      def search_filter_scope(scope)
        return scope if list_filter_params.blank?

        from = list_filter_params[:from_date]
        to = list_filter_params[:to_date]
        by_created_at = list_filter_params[:filter_created_at] || false

        scope = scope.where("#{id_params[:model_name].pluralize}.created_at >= ?", Time.zone.at(from.to_time)) if from && by_created_at
        scope = scope.where("#{id_params[:model_name].pluralize}.created_at <= ?", Time.zone.at(to.to_time) + 1.day) if to && by_created_at
        scope = scope.where("#{id_params[:model_name].pluralize}.updated_at >= ?", Time.zone.at(from.to_time)) if from && !by_created_at
        scope = scope.where("#{id_params[:model_name].pluralize}.updated_at <= ?", Time.zone.at(to.to_time) + 1.day) if to && !by_created_at
        id_params[:total_elements] = scope.size

        scope
      end

      def search_by_ids_for_sample(c_id, model, ids)
        scope =
          model.includes_for_list_display
               .by_collection_id(c_id.to_i)
               .where(id: ids)
        scope = scope.product_only if list_filter_params.present? && list_filter_params[:product_only]
        scope = order_by_updated_at(scope) if params[:molecule_sort]
        scope
      end

      def order_by_updated_at(scope)
        scope.order('samples.updated_at ASC')
             .page(params[:page]).per(page_size)
      end

      def serialize_result_by_ids(scope)
        result = {}
        pages = pages(id_params[:total_elements])
        page = params[:page] > pages ? 1 : params[:page]
        scope = scope.page(page).per(page_size) if page != params[:page] || list_filter_params.present?
        serialized_scope = serialized_scope_for_result_by_id(scope)

        result[id_params[:model_name].pluralize] = {
          elements: serialized_scope,
          ids: id_params[:ids],
          page: page,
          perPage: page_size,
          pages: pages,
          totalElements: id_params[:total_elements],
        }
        result
      end

      def serialized_scope_for_result_by_id(scope)
        # TODO: generic elements
        serialized_scope = []
        scope.map do |s|
          serialized_scope =
            if id_params[:model_name] == 'sample'
              serialized_result_by_id_for_sample(s, serialized_scope)
            else
              serialized_result_by_id(s, serialized_scope)
            end
        end
        serialized_scope.sort_by! { |object| id_params['ids'].index object[:id] }
      end

      def serialized_result_by_id_for_sample(sample, serialized_scope)
        detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
        serialized = Entities::SampleEntity.represent(
          sample,
          detail_levels: detail_levels,
          displayed_in_list: true,
        ).serializable_hash
        serialized_scope.push(serialized)
      end

      def serialized_result_by_id(element, serialized_scope)
        entities = "Entities::#{id_params[:model_name].capitalize}Entity".constantize
        serialized =
          entities.represent(element, displayed_in_list: true).serializable_hash
        serialized_scope.push(serialized)
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
                when 'elements'
                  elements_search(c_id)
                end

        if search_method != 'advanced' && search_method != 'structure' && molecule_sort == true
          scope.includes(:molecule)
               .joins(:molecule)
               .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
               .order('molecules.sum_formular')
        elsif search_by_method.start_with?('element_short_label_')
          klass = Labimotion::ElementKlass.find_by(name: search_by_method.sub("element_short_label_",""))
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
          # elements[:research_plan_ids] = user_research_plans.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          # elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when ResearchPlan
          elements[:research_plan_ids] = scope&.ids
          sample_ids = ResearchPlan.sample_ids_by_research_plan_ids(elements[:research_plan_ids])
          reaction_ids = ResearchPlan.reaction_ids_by_research_plan_ids(elements[:research_plan_ids])
          elements[:sample_ids] = sample_ids.map(&:sample_id).uniq
          elements[:reaction_ids] = reaction_ids.map(&:reaction_id).uniq
          elements[:wellplate_ids] = ResearchPlansWellplate.get_wellplates(elements[:research_plan_ids]).uniq
          # elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id).uniq
          # elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
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
        end
        elements
      end
    end

    resource :search do
      namespace :elements do
        desc 'Return all matched elements and associations for substring query'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          scope = elements_search(@c_id)
          return unless scope

          elements_ids = elements_by_scope(scope)

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

      namespace :by_ids do
        desc 'Return elements by ids'
        params do
          use :search_params
        end

        after_validation do
          set_var
        end

        post do
          scope = search_by_ids(@c_id)
          return unless scope

          serialize_result_by_ids(scope)
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

# rubocop:enable Metrics/MethodLength, Metrics/BlockLength, Metrics/AbcSize, Metrics/ClassLength
