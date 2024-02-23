class AllElementSearch
  PG_ELEMENTS = %w[Sample Reaction Screen Wellplate ResearchPlan Element]

  def initialize(term)
    @term = term
  end

  def search_by_substring
    Results.new(PgSearch.multisearch(@term))
  end

  class Results
    attr_reader :samples, :results

    def initialize(results)
      @results = results
    end

    def first
      Results.new(@results.first)
    end

    def empty?
      @results.empty?
    end

    def by_collection_id(id, current_user)
      types = if (prof = current_user&.profile&.data)
                (prof.fetch('layout', {}).keys.map(&:camelize)) & PG_ELEMENTS
              else
                PG_ELEMENTS
              end
      types.push('Element')
      first_type = types.first
      query = "(searchable_type = '#{first_type}' AND searchable_id IN (" \
                "SELECT #{first_type.underscore}_id FROM collections_#{first_type.underscore}s "\
                "WHERE collection_id = #{id} AND deleted_at IS NULL))"
      if (types.count > 1)
        types[1..-1].each { |type|
          query = query +
                  " OR (searchable_type = '#{type}' AND searchable_id IN (" \
                  "SELECT #{type.underscore}_id FROM collections_#{type.underscore}s "\
                  "WHERE collection_id = #{id} AND deleted_at IS NULL))"
        }
      end

      @results = @results.where(query)
      Results.new(@results)
    end

    def molecules
      filter_results_by_type('Molecule')
    end

    def samples
      filter_results_by_type('Sample')
    end

    def reactions
      filter_results_by_type('Reaction')
    end

    def wellplates
      filter_results_by_type('Wellplate')
    end

    def screens
      filter_results_by_type('Screen')
    end

    def research_plan
      filter_results_by_type('ResearchPlan')
    end

    def elements
      filter_results_by_type('Element')
    end

    def molecules_ids
      filter_results_ids_by_type('Molecule')
    end

    def samples_ids
      filter_results_ids_by_type('Sample')
    end

    def reactions_ids
      filter_results_ids_by_type('Reaction')
    end

    def wellplates_ids
      filter_results_ids_by_type('Wellplate')
    end

    def screens_ids
      filter_results_ids_by_type('Screen')
    end

    def research_plan_ids
      filter_results_ids_by_type('ResearchPlan')
    end

    def element_ids
      filter_results_ids_by_type('Element')
    end

    private

    def filter_results_by_type(type)
      @results.where(searchable_type: type).includes(:searchable)
    end

    def filter_results_ids_by_type(type)
      @results.where(searchable_type: type).pluck(:searchable_id)
    end
  end
end
