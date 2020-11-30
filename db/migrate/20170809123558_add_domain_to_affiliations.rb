class AddDomainToAffiliations < ActiveRecord::Migration[4.2]
  def change
    add_column :affiliations, :domain, :string unless column_exists? :affiliations, :domain
    add_column :affiliations, :cat, :string unless column_exists? :affiliations, :cat
  end
end
