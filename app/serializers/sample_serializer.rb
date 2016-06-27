class SampleSerializer < ActiveModel::Serializer
  include Labeled

  attributes *DetailLevels::Sample.new.base_attributes

  has_one :molecule

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

  def analysis_kinds
    analyses = object.analyses
    analyses.inject({confirmed: {}, unconfirmed: {}, other: {}, count:{confirmed: 0, unconfirmed:0, other: 0}}) do |result, analysis|
      if analysis["status"] == "Confirmed"
        if result[:confirmed][analysis["kind"]] then
          result[:confirmed][analysis["kind"]][:count] += 1
        else
          result[:confirmed][analysis["kind"]] = {
            label: analysis["kind"],
            count: 1
          }
        end
        result[:count][:confirmed] +=1
      elsif analysis["status"] == "Unconfirmed"
        if result[:unconfirmed][analysis["kind"]] then
          result[:unconfirmed][analysis["kind"]][:count] += 1
        else
          result[:unconfirmed][analysis["kind"]] = {
            label: analysis["kind"],
            count: 1
          }
        end
        result[:count][:unconfirmed] +=1
      else
        if result[:other][analysis["kind"]] then
          result[:other][analysis["kind"]][:count] += 1
        else
          result[:other][analysis["kind"]] = {
            label: analysis["kind"],
            count: 1
          }
        end
        result[:count][:other] +=1
      end
      result
    end
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
