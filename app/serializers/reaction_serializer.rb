class Material < Sample
  attr_accessor :reference, :equivalent
end

class MaterialSerializer < SampleSerializer
  attributes :reference, :equivalent
end

class MaterialSerializer::Level0 < SampleSerializer::Level1
  attributes :reference, :equivalent
end

class MaterialSerializer::Level2 < SampleSerializer::Level1 #should be lvl 2 once defined
  attributes :reference, :equivalent
end

class ReactionSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :created_at, :updated_at, :description, :timestamp_start, :timestamp_stop,
             :observation, :purification, :dangerous_products, :solvent, :tlc_solvents, :tlc_description, :rf_value, :temperature, :status, :reaction_svg_file


  has_many :starting_materials, serializer: MaterialSerializer
  has_many :reactants, serializer: MaterialSerializer
  has_many :products, serializer: MaterialSerializer

  has_many :literatures

  def starting_materials
    decorated_materials( object.reactions_starting_material_samples )
  end

  def reactants
    decorated_materials( object.reactions_reactant_samples )
  end

  def products
    decorated_materials( object.reactions_product_samples )
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'reaction'
  end

  class BasePermissionSerializer < ActiveModel::Serializer
    attributes :id, :type, :is_restricted

    def type
      'reaction'
    end

    def is_restricted
      true
    end

    def starting_materials
      decorated_materials( object.reactions_starting_material_samples )
    end

    def reactants
      decorated_materials( object.reactions_reactant_samples )
    end

    def products
      decorated_materials( object.reactions_product_samples )
    end

    # TODO fix duplications
    private

      def decorated_materials reaction_materials
        reaction_materials_attributes = Hash[Array(reaction_materials).map {|r| [r.sample_id, r.attributes]}]
        reaction_materials.map do |reaction_material|
          m = Material.new(reaction_material.sample.attributes)
          rma = reaction_materials_attributes[reaction_material.sample_id] || {}
          m.reference = rma['reference']
          m.equivalent = rma['equivalent']
          m
        end
      end
  end

  class Level0 < BasePermissionSerializer
    attributes :reaction_svg_file

    has_many :starting_materials, serializer: MaterialSerializer::Level0
    has_many :reactants, serializer: MaterialSerializer::Level0
    has_many :products, serializer: MaterialSerializer::Level0
  end

  class Level1 < Level0
    attributes :observation, :description #calculation
  end

  class Level2 < Level1
    has_many :starting_materials, serializer: MaterialSerializer::Level2
    has_many :reactants, serializer: MaterialSerializer::Level2
    has_many :products, serializer: MaterialSerializer::Level2
  end

  private

    def decorated_materials reaction_materials
      reaction_materials_attributes = Hash[Array(reaction_materials).map {|r| [r.sample_id, r.attributes]}]
      reaction_materials.map do |reaction_material|
        m = Material.new(reaction_material.sample.attributes)
        rma = reaction_materials_attributes[reaction_material.sample_id] || {}
        m.reference = rma['reference']
        m.equivalent = rma['equivalent']
        m
      end
    end

end
