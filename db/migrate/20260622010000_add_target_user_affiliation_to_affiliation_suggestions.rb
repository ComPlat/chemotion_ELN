# frozen_string_literal: true

class AddTargetUserAffiliationToAffiliationSuggestions < ActiveRecord::Migration[6.1]
  def change
    add_column :affiliation_suggestions, :target_user_affiliation_id, :integer
  end
end
