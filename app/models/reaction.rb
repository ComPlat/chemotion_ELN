class Reaction < ActiveRecord::Base
  has_many :collections_reactions
  has_many :collections, through: :collections_reactions

  has_many :reactions_starting_material_samples
  has_many :starting_materials, through: :reactions_starting_material_samples, source: :sample

  has_many :reactions_reactant_samples
  has_many :reactants, through: :reactions_reactant_samples, source: :sample

  has_many :reactions_product_samples
  has_many :products, through: :reactions_product_samples, source: :sample

  has_many :literatures
end
