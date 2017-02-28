class SampleSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Sample.new.base_attributes

  has_one :molecule
  has_one :container, :serializer => ContainerSerializer
  has_one :tag

  has_many :residues
  has_many :elemental_compositions

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'sample'
  end

  def _contains_residues
    object.residues.any?
  end

  def molecule_svg
    molecule.molecule_svg_file
  end

  def is_restricted
    false
  end

  def children_count
    unless object.new_record?
      object.children.count.to_i
    end
  end

  def parent_id
    object.parent.id if object.parent
  end

  class Level0 < ActiveModel::Serializer
    include SampleLevelSerializable
    define_restricted_methods_for_level(0)

    def molecule
      {
        molecular_weight: object.molecule.try(:molecular_weight),
        exact_molecular_weight: object.molecule.try(:exact_molecular_weight),
      }
    end
  end

  class Level1 < ActiveModel::Serializer
    include SampleLevelSerializable
    define_restricted_methods_for_level(1)
  end

  class Level2 < ActiveModel::Serializer
    include SampleLevelSerializable
    define_restricted_methods_for_level(2)

    def analyses
      object.analyses.map {|x| x['datasets'] = {:datasets => []}}
    end
  end

  class Level3 < ActiveModel::Serializer
    include SampleLevelSerializable
    define_restricted_methods_for_level(3)
  end
end

class SampleSerializer::Level10 < SampleSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
  end
end
