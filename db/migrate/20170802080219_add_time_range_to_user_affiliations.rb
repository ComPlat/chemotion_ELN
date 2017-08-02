class AddTimeRangeToUserAffiliations < ActiveRecord::Migration
  def change
    add_column :user_affiliations, :from, :date unless column_exists? :user_affiliations, :from
    add_column :user_affiliations, :to, :date unless column_exists? :user_affiliations, :to
    add_column :user_affiliations, :main, :boolean unless column_exists? :user_affiliations, :main
  end
end
