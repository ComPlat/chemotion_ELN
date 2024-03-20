class ValidateSearchTextToResearchPlan < ActiveRecord::Migration[6.1]
  def up
    # Force to rebuild Multisearch -> :parse_search_text.
    # It produces an entry for each research plan in the pg_search_document.
    PgSearch::Multisearch.rebuild(ResearchPlan, clean_up: false)
  end

  def down
    # Do nothing
  end
end
