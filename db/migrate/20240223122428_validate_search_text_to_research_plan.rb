class ValidateSearchTextToResearchPlan < ActiveRecord::Migration[6.1]
  def up
    # Force to run the before_validation of each research plan -> :parse_search_text.
    # Additional it produces an entry for each research plan in the pg_search_document.
    ResearchPlan.find_each do |instance|
      instance.search_text = ""
      instance.save
    end
  end

  def down
    # Do nothing
  end
end
