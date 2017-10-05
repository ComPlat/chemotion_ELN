class AddDeletedAtToAffiliations < ActiveRecord::Migration
  def change
    add_column :user_affiliations, :deleted_at, :datetime unless column_exists? :user_affiliations, :deleted_at
    add_column :affiliations, :from , :date unless column_exists? :affiliations, :from
    add_column :affiliations, :to, :date unless column_exists? :affiliations, :to
  end
end
