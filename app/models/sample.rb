class Sample < ActiveRecord::Base
  has_many :collections_samples
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples
  has_many :reactions_reactant_samples
  has_many :reactions_product_samples

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction
  
  composed_of :amount, mapping: %w(amount_value, amount_unit)
end
