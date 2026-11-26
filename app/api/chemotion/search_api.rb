# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/ClassLength

# rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Lint/SafeNavigationChain, Style/RedundantParentheses

# rubocop:disable Naming/VariableName

module Chemotion
  class SearchAPI < Grape::API
    include Grape::Kaminari

    # Text searches (search_by_method) on sample data; they need a sample detail level above 0.
    SAMPLE_TEXT_SEARCHES = %w[
      iupac_name inchistring inchikey cano_smiles sample_name sample_short_label molecule_name substring
    ].freeze
    # Text searches on sample labels, which are visible at every sample detail level.
    SAMPLE_LABEL_SEARCHES = %w[sum_formula sample_external_label].freeze
    REACTION_TEXT_SEARCHES = %w[reaction_name reaction_short_label reaction_status reaction_rinchi_string].freeze
    SBMM_SAMPLE_TEXT_SEARCHES = %w[
      sbmm_sample_name sbmm_sample_short_label sbmm_sample_organism sbmm_sample_taxon_id sbmm_sample_strain
      sbmm_sample_tissue sbmm_systematic_name sbmm_short_name sbmm_other_identifier sbmm_own_identifier
      sbmm_ec_numbers sbmm_organism sbmm_taxon_id sbmm_strain sbmm_tissue
    ].freeze
    DEVICE_DESCRIPTION_TEXT_SEARCHES = %w[
      device_description_name device_description_short_label device_description_vendor_device_name
      device_description_vendor_device_id device_description_serial_number device_description_vendor_company_name
      device_description_general_tags device_description_ontologies
    ].freeze

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
            All Samples Reactions Wellplates Screens all samples reactions wellplates screens elements cell_lines
            sequence_based_macromolecule_samples device_descriptions by_ids advanced structure
          ]
          optional :molfile, type: String
          optional :search_type, type: String, values: %w[similar sub]
          optional :tanimoto_threshold, type: Float
          optional :page_size, type: Integer
          optional :structure_search, type: Boolean
          optional :name, type: String
          optional :advanced_params, type: Array do
            optional :link, type: String, values: ['', 'AND', 'OR'], default: ''
            optional :match, type: String,
                             values: ['=', 'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE', '>', '<', '>=', '<=', '@>', '<@'],
                             default: 'LIKE'
            optional :table, type: String, values: %w[
              samples reactions wellplates screens research_plans elements segments literatures
              sequence_based_macromolecule_samples device_descriptions cell_lines
            ]
            optional :element_id, type: Integer
            optional :unit, type: String
            requires :field, type: Hash
            requires :value, type: String
            optional :smiles, type: String
            optional :sub_values, type: Array
            optional :available_options, type: Array
          end
          optional :id_params, type: Hash do
            requires :model_name, type: String, values: %w[
              sample reaction wellplate screen element research_plan sequence_based_macromolecule_sample
              device_description cell_lines
            ]
            # Generic klass name, which keys the result. Cf. SharedMethods#serialize_generic_elements
            optional :element_klass, type: String, regexp: /\A\w+\z/
            requires :ids, type: Array
            optional :total_elements, type: Integer
            optional :with_filter, type: Boolean
          end
          optional :list_filter_params, type: Hash do
            optional :filter_created_at, type: Boolean
            # Unix seconds, as the collection listing endpoints take them. A Date would be coerced
            # from the browser's ISO string in UTC and land a day early east of Greenwich.
            optional :from_date, type: Integer
            optional :to_date, type: Integer
            optional :product_only, type: Boolean
            optional :user_label, type: Integer
          end
        end
        requires :collection_id, type: String
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

      # Resolves the collection scope of a search request: the collection named by +collection_id+,
      # with the detail levels the current user holds on it.
      def set_search_scope
        collection = Collection.accessible_for(current_user).find(params[:collection_id])
        @scope = Usecases::Search::CollectionScope.new(user: current_user, collections: [collection])
      end

      # The detail level, and its minimum, that the text search +method+ needs on +klass+, or nil
      # when +method+ cannot search +klass+. An empty hash means no level is needed.
      #
      # @param klass [Class] the element type searched
      # @param method [String] search_by_method
      # @return [Hash{Symbol => Object}, nil] +level+ and +min+, {} or nil
      def text_search_requirement(klass, method)
        sample_data = { level: :sample_detail_level, min: 1 } if SAMPLE_TEXT_SEARCHES.include?(method)
        sample_labels = { level: :sample_detail_level, min: 0 } if SAMPLE_LABEL_SEARCHES.include?(method)
        case klass.name
        when 'Sample'
          sample_data || sample_labels
        when 'Reaction'
          REACTION_TEXT_SEARCHES.include?(method) ? {} : sample_data
        when 'Wellplate'
          method == 'wellplate_name' ? {} : sample_data
        when 'Screen'
          {} if %w[screen_name conditions requirements substring].include?(method)
        when 'SequenceBasedMacromoleculeSample'
          if (SBMM_SAMPLE_TEXT_SEARCHES + ['substring']).include?(method)
            { level: :sequencebasedmacromoleculesample_detail_level, min: 1 }
          end
        when 'DeviceDescription'
          if (DEVICE_DESCRIPTION_TEXT_SEARCHES + ['substring']).include?(method)
            { level: :devicedescription_detail_level, min: 1 }
          end
        end
      end

      # Runs the text search +search_by_method+ on +klass+ in the collections of the scope whose detail
      # levels allow it, as in {#search_elements}.
      #
      # @param klass [Class] the element type searched
      # @param joins [Symbol, nil] association to join before searching
      # @return [ActiveRecord::Relation] the matching records, or none when the search is not allowed
      def search_by_detail_level(klass, joins: nil)
        method = search_by_method.to_s
        requirement = text_search_requirement(klass, method)
        return klass.none unless requirement

        scope = requirement.empty? ? @scope : @scope.at_least(requirement[:level], requirement[:min])
        relation = scope.relation_for(klass)
        relation = relation.joins(joins) if joins
        relation.search_by(method, params[:selection][:name])
      end

      def id_params
        params[:selection][:id_params]
      end

      def list_filter_params
        params[:selection][:list_filter_params]
      end

      def list_filters
        Usecases::Search::ListFilter.from_params(params)
      end

      # TODO: move to Sample (DRY Usecases::Search::StructureSearch::basic_scope)
      def sample_structure_search
        molfile = Fingerprint.standardized_molfile(params[:selection][:molfile])
        threshold = params[:selection][:tanimoto_threshold]

        # TODO: implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        scope =
          case params[:selection][:search_type]
          when 'similar'
            samples_with_data.search_by_fingerprint_sim(molfile, threshold)
          when 'sub'
            samples_with_data.search_by_fingerprint_sub(molfile)
          end
        order_by_molecule(scope)
      end

      # Samples of the scope in collections that show sample data (sample detail level above 0).
      def samples_with_data
        @scope.at_least(:sample_detail_level, 1).relation_for(Sample)
      end

      def order_by_molecule(scope)
        scope.includes(:molecule)
             .joins(:molecule)
             .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
             .order('molecules.sum_formular')
      end

      def advanced_search
        conditions = Usecases::Search::ConditionsForAdvancedSearch.new(
          detail_levels: @scope.detail_levels,
          params: params[:selection][:advanced_params],
          user: current_user,
        ).filter!
        return Sample.none if conditions[:error].present? || conditions[:model_name].blank?

        scope = @scope.relation_for(conditions[:model_name])
                      .where(conditions[:query])
                      .joins(conditions[:joins].join(' '))
        scope = order_by_molecule(scope) if conditions[:model_name] == Sample
        if %w[ResearchPlan Wellplate].include?(conditions[:model_name].to_s)
          scope = scope.group("#{conditions[:model_name].table_name}.id")
        end
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
              # Per-element (not for_collection like the other element types below): a sample reached
              # via a restrictive share still shows its true level if the user owns/better-shares it
              # in another collection. Keep this deliberate divergence when editing.
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
                  # Per-element (not for_collection like the other element types): keeps a sample's
                  # true level when the user owns/better-shares it in another collection. Deliberate.
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
        sequence_based_macromolecule_sample_ids = elements.fetch(:sequence_based_macromolecule_sample_ids, [])
        device_description_ids = elements.fetch(:device_description_ids, [])

        # Every element on the page comes from the collections of the scope, so their per-class detail
        # levels apply to all of them. Without this the entities render fail-open (full access),
        # leaking fields a restrictive collection share is meant to hide (e.g. reaction analyses).
        detail_levels = @scope.class_detail_levels

        paginated_reaction_ids = Kaminari.paginate_array(reaction_ids).page(page).per(page_size)
        serialized_reactions = Reaction.find(paginated_reaction_ids).map do |reaction|
          Entities::ReactionEntity.represent(reaction, detail_levels: detail_levels, displayed_in_list: true)
                                  .serializable_hash
        end

        paginated_wellplate_ids = Kaminari.paginate_array(wellplate_ids).page(page).per(page_size)
        serialized_wellplates = Wellplate.find(paginated_wellplate_ids).map do |wellplate|
          Entities::WellplateEntity.represent(wellplate, detail_levels: detail_levels, displayed_in_list: true)
                                   .serializable_hash
        end

        paginated_screen_ids = Kaminari.paginate_array(screen_ids).page(page).per(page_size)
        serialized_screens = Screen.find(paginated_screen_ids).map do |screen|
          Entities::ScreenEntity.represent(screen, detail_levels: detail_levels, displayed_in_list: true)
                                .serializable_hash
        end

        paginated_cell_line_ids = Kaminari.paginate_array(cell_line_ids).page(page).per(page_size)
        serialized_cell_lines = CelllineSample.find(paginated_cell_line_ids).map do |cell_line|
          Entities::CellLineSampleEntity.represent(cell_line, detail_levels: detail_levels, displayed_in_list: true)
                                        .serializable_hash
        end

        paginated_research_plan_ids = Kaminari.paginate_array(research_plan_ids).page(page).per(page_size)
        serialized_research_plans = ResearchPlan.find(paginated_research_plan_ids).map do |research_plan|
          Entities::ResearchPlanEntity.represent(research_plan, detail_levels: detail_levels, displayed_in_list: true)
                                      .serializable_hash
        end

        paginated_sequence_based_macromolecule_sample_ids =
          Kaminari.paginate_array(sequence_based_macromolecule_sample_ids)
                  .page(page).per(page_size)
        serialized_sequence_based_macromolecule_samples =
          SequenceBasedMacromoleculeSample.find(paginated_sequence_based_macromolecule_sample_ids)
                                          .map do |sequence_based_macromolecule_sample|
            Entities::SequenceBasedMacromoleculeSampleEntity
              .represent(sequence_based_macromolecule_sample, detail_levels: detail_levels, displayed_in_list: true)
              .serializable_hash
          end

        paginated_device_description_ids = Kaminari.paginate_array(device_description_ids).page(page).per(page_size)
        serialized_device_descriptions =
          DeviceDescription.find(paginated_device_description_ids).map do |device_description|
            Entities::DeviceDescriptionEntity
              .represent(device_description, detail_levels: detail_levels, displayed_in_list: true)
              .serializable_hash
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
          sequence_based_macromolecule_samples: {
            elements: serialized_sequence_based_macromolecule_samples,
            totalElements: sequence_based_macromolecule_sample_ids.size,
            page: page,
            pages: pages(sequence_based_macromolecule_sample_ids.size),
            perPage: page_size,
            ids: sequence_based_macromolecule_sample_ids,
          },
          device_descriptions: {
            elements: serialized_device_descriptions,
            totalElements: device_description_ids.size,
            page: page,
            pages: pages(device_description_ids.size),
            perPage: page_size,
            ids: device_description_ids,
          },
        }

        klasses = Labimotion::ElementKlass.where(is_active: true, is_generic: true)
        klasses.each do |klass|
          element_ids_for_klass = Labimotion::Element.where(id: element_ids, element_klass_id: klass.id).pluck(:id)
          paginated_element_ids = Kaminari.paginate_array(element_ids_for_klass).page(page).per(page_size)
          serialized_elements = Labimotion::Element.find(paginated_element_ids).map do |element|
            Labimotion::ElementEntity.represent(element, detail_levels: detail_levels, displayed_in_list: true)
                                     .serializable_hash
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
      def search_elements
        search_method = search_by_method
        molecule_sort = params[:molecule_sort]
        arg = params[:selection][:name]
        return if (search_method !~ /advanced|structure/) && !arg.presence

        with_sample_data = @scope.at_least(:sample_detail_level, 1)
        scope = case search_method
                when 'polymer_type'
                  with_sample_data.relation_for(Sample).order('samples.updated_at DESC')
                                  .by_residues_custom_info('polymer_type', arg)
                when 'sum_formula', 'sample_external_label'
                  @scope.at_least(:sample_detail_level, 0).relation_for(Sample).order('samples.updated_at DESC')
                        .search_by(search_method, arg)
                when 'iupac_name', 'inchistring', 'inchikey', 'cano_smiles',
                     'sample_name', 'sample_short_label', 'molecule_name'
                  with_sample_data.relation_for(Sample).order('samples.updated_at DESC')
                                  .search_by(search_method, arg)
                when 'cas'
                  with_sample_data.relation_for(Sample).order('samples.updated_at DESC')
                                  .by_sample_xref_cas(arg)
                when 'reaction_name', 'reaction_short_label', 'reaction_status', 'reaction_rinchi_string'
                  @scope.relation_for(Reaction).search_by(search_method, arg)
                when 'wellplate_name'
                  @scope.relation_for(Wellplate).search_by(search_method, arg)
                when 'screen_name'
                  @scope.relation_for(Screen).search_by(search_method, arg)
                when 'substring'
                  # NB we'll have to split the content of the pg_search_document into
                  # MW + external_label (dl_s = 0) and the other info only available
                  # from dl_s > 0. For now one can use the suggested search instead.
                  Usecases::Search::AllElementsSearch.new(
                    term: params[:selection][:name],
                    scope: with_sample_data,
                    user: current_user,
                  ).search_by_substring
                when 'structure'
                  sample_structure_search
                when 'advanced'
                  advanced_search
                when 'cell_line_material_name'
                  @scope.relation_for(CelllineSample).material_name_like(arg)
                when 'cell_line_sample_name'
                  @scope.relation_for(CelllineSample).name_like(arg)
                when *SBMM_SAMPLE_TEXT_SEARCHES
                  @scope.at_least(:sequencebasedmacromoleculesample_detail_level, 1)
                        .relation_for(SequenceBasedMacromoleculeSample)
                        .joins(:sequence_based_macromolecule)
                        .order('sequence_based_macromolecule_samples.updated_at DESC')
                        .search_by(search_method, arg)
                when *DEVICE_DESCRIPTION_TEXT_SEARCHES
                  @scope.at_least(:devicedescription_detail_level, 1)
                        .relation_for(DeviceDescription)
                        .order('device_descriptions.updated_at DESC')
                        .search_by(search_method, arg)
                end

        if search_method != 'advanced' && search_method != 'structure' && molecule_sort == true
          scope.includes(:molecule)
               .joins(:molecule)
               .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
               .order('molecules.sum_formular')
        elsif search_by_method.start_with?('element_short_label_')
          klass = Labimotion::ElementKlass.find_by(name: search_by_method.sub('element_short_label_', ''))
          return @scope.relation_for(Labimotion::Element).by_klass_id_short_label(klass.id, arg)
        end
        scope
      end

      # +pluck(:id)+, not +ids+: since Rails 7.1 +ids+ on a relation with +includes+ adds
      # GROUP BY <primary key>, which PostgreSQL rejects next to the ORDER BY on the included
      # table (order_by_molecule orders samples by molecules.sum_formular).
      def elements_by_scope(scope)
        elements = {}
        user_samples = @scope.relation_for(Sample)
        user_reactions = @scope.relation_for(Reaction)
        user_wellplates = @scope.relation_for(Wellplate)
        user_screens = @scope.relation_for(Screen)
        user_research_plans = @scope.relation_for(ResearchPlan)
        user_elements = @scope.relation_for(Labimotion::Element)

        case scope&.first
        when Sample
          elements[:sample_ids] = scope&.pluck(:id)
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:wellplate_ids] = user_wellplates.by_sample_ids(elements[:sample_ids]).uniq.pluck(:id)
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when Reaction
          elements[:reaction_ids] = scope&.pluck(:id)
          elements[:sample_ids] = user_samples.by_reaction_ids(elements[:reaction_ids]).pluck(:id).uniq
          elements[:wellplate_ids] = user_wellplates.by_sample_ids(elements[:sample_ids]).uniq.pluck(:id)
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_reaction_ids(elements[:reaction_ids]).pluck(:id).uniq
        when Wellplate
          elements[:wellplate_ids] = scope&.pluck(:id)
          elements[:screen_ids] = user_screens.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:sample_ids] = user_samples.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = Usecases::Search::ResearchPlanRelations.plan_ids_for_wellplates(
            wellplate_ids: elements[:wellplate_ids], scope: @scope,
          )
          # elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when Screen
          elements[:screen_ids] = scope&.pluck(:id)
          elements[:wellplate_ids] = user_wellplates.by_screen_ids(elements[:screen_ids]).uniq.pluck(:id)
          elements[:sample_ids] = user_samples.by_wellplate_ids(elements[:wellplate_ids]).uniq.pluck(:id)
          elements[:reaction_ids] = user_reactions.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:research_plan_ids] = user_research_plans.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
          elements[:element_ids] = user_elements.by_sample_ids(elements[:sample_ids]).pluck(:id).uniq
        when ResearchPlan
          elements[:research_plan_ids] = scope&.pluck(:id)
          elements.merge!(
            Usecases::Search::ResearchPlanRelations.call(
              plan_ids: elements[:research_plan_ids], scope: @scope,
            ),
          )
        when Labimotion::Element
          elements[:element_ids] = scope&.pluck(:id)
          sids = Labimotion::ElementsSample.where(element_id: elements[:element_ids]).pluck(:sample_id)
          elements[:sample_ids] = user_samples.where(id: sids).uniq.pluck(:id)
        when Usecases::Search::AllElementsSearch::Results
          # TODO: check this samples_ids + molecules_ids ???? There are no Molecules in pg_search_documents
          elements[:sample_ids] = scope&.samples_ids
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

          elements[:sequence_based_macromolecule_sample_ids] = scope&.sequence_based_macromolecule_sample_ids

          elements[:device_description_ids] = scope&.device_description_ids

          elements[:cell_line_ids] = scope&.cell_line_ids

          elements[:element_ids] = (scope&.element_ids).uniq
        when CelllineSample
          elements[:cell_line_ids] = scope&.pluck(:id)
        when SequenceBasedMacromoleculeSample
          elements[:sequence_based_macromolecule_sample_ids] = scope&.pluck(:id)
        when DeviceDescription
          elements[:device_description_ids] = scope&.pluck(:id)
        end
        Usecases::Search::ListFilter.apply(elements, list_filters)
      end
    end

    resource :search do
      namespace :cell_lines do
        desc 'Return all matched cell lines and associations for substring query'
        params do
          use :search_params
        end

        after_validation do
          set_search_scope
        end

        post do
          query = @params[:selection][:name]
          cell_lines =
            case search_by_method
            when 'cell_line_material_name'
              @scope.relation_for(CelllineSample).material_name_like(query)
            when 'cell_line_sample_name'
              @scope.relation_for(CelllineSample).name_like(query)
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
          set_search_scope
        end

        post do
          scope = search_elements
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
          set_search_scope
        end

        post do
          Usecases::Search::StructureSearch.new(
            scope: @scope,
            params: params,
            user: current_user,
          ).perform!
        end
      end

      namespace :advanced do
        desc 'Return all matched elements and associations for advanced / detail search'
        params do
          use :search_params
        end

        after_validation do
          set_search_scope
        end

        post do
          # Ensure the first element's 'link' is an empty string unless already set.
          # This prevents invalid SQL fragments like "AND ( OR (samples.name=..." from being generated.
          if (link_hash = params.dig('selection', 'advanced_params', 0)).is_a?(Hash) && link_hash['link'] != ''
            link_hash['link'] = ''
          end

          conditions =
            Usecases::Search::ConditionsForAdvancedSearch.new(
              detail_levels: @scope.detail_levels,
              params: params[:selection][:advanced_params],
              user: current_user,
            ).filter!

          results = Usecases::Search::AdvancedSearch.new(
            scope: @scope,
            params: params,
            user: current_user,
            conditions: conditions,
          ).perform!

          results['cell_lines'] = results['cellline_samples'] if results['cellline_samples'].present?
          results
        end
      end

      namespace :by_ids do
        desc 'Return elements by ids'
        params do
          use :search_params
        end

        after_validation do
          set_search_scope
        end

        post do
          Usecases::Search::ByIds.new(
            scope: @scope,
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
          set_search_scope
        end

        post do
          samples =
            case search_by_method
            when 'structure'
              sample_structure_search
            when 'cas'
              samples_with_data.by_sample_xref_cas(params[:selection][:name])
            else
              search_by_detail_level(Sample)
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
          set_search_scope
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
              @scope.relation_for(Reaction).where(id: reaction_ids)
            else
              search_by_detail_level(Reaction)
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
          set_search_scope
        end

        post do
          wellplates =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search
              @scope.relation_for(Wellplate).by_sample_ids(associated_samples.pluck(:id))
            else
              search_by_detail_level(Wellplate)
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
          set_search_scope
        end

        post do
          screens =
            case search_by_method
            when 'structure'
              associated_samples = sample_structure_search
              well_ids = Wellplate.by_sample_ids(associated_samples.pluck(:id))
              @scope.relation_for(Screen).by_wellplate_ids(well_ids)
            else
              search_by_detail_level(Screen)
            end

          serialization_by_elements_and_page(
            elements_by_scope(screens),
            params[:page],
          )
        end
      end

      namespace :sequence_based_macromolecule_samples do
        desc 'Return sbmm samples and associated elements by search selection'
        params do
          use :search_params
        end

        after_validation do
          set_search_scope
        end

        post do
          sbmm_samples = search_by_detail_level(SequenceBasedMacromoleculeSample, joins: :sequence_based_macromolecule)

          serialization_by_elements_and_page(
            elements_by_scope(sbmm_samples),
            params[:page],
          )
        end
      end

      namespace :device_descriptions do
        desc 'Return device descriptions and associated elements by search selection'
        params do
          use :search_params
        end

        after_validation do
          set_search_scope
        end

        post do
          device_descriptions = search_by_detail_level(DeviceDescription)

          serialization_by_elements_and_page(
            elements_by_scope(device_descriptions),
            params[:page],
          )
        end
      end
    end
  end
end

# rubocop:enable Naming/VariableName

# rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Lint/SafeNavigationChain, Style/RedundantParentheses

# rubocop:enable Metrics/MethodLength, Metrics/AbcSize, Metrics/ClassLength
