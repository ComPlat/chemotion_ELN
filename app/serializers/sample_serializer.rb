class SampleSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :short_label, :description, :created_at, :amount_value, :amount_unit, :molfile,
             :purity, :solvent, :impurities, :location, :is_top_secret, :is_restricted, :external_label, :analyses, :children_count

  has_one :molecule

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'sample'
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

  class Level0 < ActiveModel::Serializer
    attributes :id, :type, :is_restricted, :external_label

    has_one :molecule

    def molecule
      {
        molecular_weight: object.molecule.try(:molecular_weight)
      }
    end

    def type
      'sample'
    end

    # evtl Restrictionlevel mitsenden?
    def is_restricted
      true
    end
  end

  class Level1 < Level0
    attributes :molfile

    has_one :molecule

    def molecule
      object.molecule
    end
  end

  class Level2 < Level1
    attributes :analyses

    def analyses
      object.analyses.map {|x| x['datasets'] = {:datasets => []}}
    end
  end

  class Level3 < Level2
    attributes :analyses

    def analyses
      object.analyses
    end
  end
end
