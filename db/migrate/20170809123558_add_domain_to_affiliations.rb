class AddDomainToAffiliations < ActiveRecord::Migration
  def change
    add_column :affiliations, :domain, :string unless column_exists? :affiliations, :domain
    add_column :affiliations, :cat, :string unless column_exists? :affiliations, :cat
  end
end
