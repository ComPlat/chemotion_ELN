class AllElementSearch
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

    def by_collection_id(id)
      Results.new(@results.select{|r| r.searchable.collections.map(&:id).include?(id)})
    end

    def samples
      @results.select{|r| r.searchable_type == 'Sample'}.map(&:searchable)
    end

    def reactions
      @results.select{|r| r.searchable_type == 'Reaction'}.map(&:searchable)
    end

    def wellplates
      @results.select{|r| r.searchable_type == 'Wellplate'}.map(&:searchable)
    end

    def screens
      @results.select{|r| r.searchable_type == 'Screen'}.map(&:searchable)
    end
  end
end
