class Material < Sample
  attr_accessor :reference, :equivalent
end

class MaterialSerializer < SampleSerializer
  attributes :reference, :equivalent
end

class ReactionSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :created_at, :updated_at, :description, :timestamp_start, :timestamp_stop,
             :observation, :purification, :dangerous_products, :solvent, :tlc_solvents, :tlc_description,
             :rf_value, :temperature, :status, :reaction_svg_file, :analysis_kinds

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

  def analysis_kinds
    products = object.products
    result_labels = {confirmed: {}, unconfirmed: {}, other: {}}
    products.each do |product|
      analyses = product.analyses
      analyses.inject(result_labels) { |result, analysis|
        if analysis["status"] == "Confirmed"
          if result[:confirmed][analysis["kind"]] then
            result[:confirmed][analysis["kind"]][:count] += 1
          else
            result[:confirmed][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        elsif analysis["status"] == "Unconfirmed" 
          if result[:unconfirmed][analysis["kind"]] then
            result[:unconfirmed][analysis["kind"]][:count] += 1
          else
            result[:unconfirmed][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        else
          if result[:other][analysis["kind"]] then
            result[:other][analysis["kind"]][:count] += 1
          else
            result[:other][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        end
        result
      }
    end
    result_labels
  end

  class Level0 < ActiveModel::Serializer
    attributes :id, :type, :is_restricted, :observation, :description

    has_many :starting_materials, serializer: MaterialSerializer
    has_many :reactants, serializer: MaterialSerializer
    has_many :products, serializer: MaterialSerializer

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

    # TODO fix duplication
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
