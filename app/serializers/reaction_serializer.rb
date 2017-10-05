class ReactionSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Reaction.new.base_attributes

  has_many :starting_materials, serializer: MaterialSerializer
  has_many :reactants, serializer: MaterialSerializer
  has_many :solvents, serializer: MaterialSerializer
  has_many :products, serializer: MaterialSerializer

  has_many :literatures

  has_one :container
  has_one :tag

  def code_log
    CodeLogSerializer.new(object.code_log).serializable_hash
  end

  def starting_materials
    MaterialDecorator.new(object.reactions_starting_material_samples).decorated
  end

  def reactants
    MaterialDecorator.new(object.reactions_reactant_samples).decorated
  end

  def solvents
    MaterialDecorator.new(object.reactions_solvent_samples).decorated
  end

  def products
    MaterialDecorator.new(object.reactions_product_samples).decorated
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'reaction'
  end

  class Level0 < ActiveModel::Serializer
    include ReactionLevelSerializable
    define_restricted_methods_for_level(0)
  end
end

class ReactionSerializer::Level10 < ReactionSerializer
  has_many :starting_materials
  has_many :reactants
  has_many :solvents
  has_many :products

  alias_method :original_initialize, :initialize

  def initialize(element, options={})
    original_initialize(element)
    is_hash_opt = options.class == Hash && options[:nested_dl]
    @nested_dl = is_hash_opt ? options[:nested_dl] : options
    @policy = is_hash_opt ? options[:policy] : nil
    @current_user = is_hash_opt ? options[:current_user] : nil
  end

  def starting_materials
    MaterialDecorator.new(object.reactions_starting_material_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def reactants
    MaterialDecorator.new(object.reactions_reactant_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def solvents
    MaterialDecorator.new(object.reactions_solvent_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def products
    MaterialDecorator.new(object.reactions_product_samples).decorated.map do |s|
      spl_obj = Sample.find(s.id)
      spl_opts = {  nested_dl: @nested_dl,
                    policy: ElementPolicy.new(@current_user, spl_obj),
                    current_user: @current_user }
      "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".
        constantize.new(s, spl_opts).
        serializable_hash
    end
  end
end
