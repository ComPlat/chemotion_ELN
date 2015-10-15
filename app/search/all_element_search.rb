class AllElementSearch
  def initialize(term, user_id)
    @term = term
    @user_id = user_id
  end

  def search_by_substring
    Results.new(PgSearch.multisearch(@term), @user_id)
  end

  class Results
    attr_reader :samples, :results

    def initialize(results, user_id)
      @results = results
      @user_id = user_id
    end

    def first
      Results.new(@results.first, @user_id)
    end

    def empty?
      @results.empty?
    end

    def by_collection_id(id)
      Results.new(@results.select{|r| r.searchable.collections.map(&:id).include?(id)}, @user_id)
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

    private

    def filter_results_by_type(type)
      @results.select{|r| r.searchable_type == type && r.searchable.collections.pluck(:user_id).include?(@user_id)}.map(&:searchable)
    end
  end
end
