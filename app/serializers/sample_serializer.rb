class SampleSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :description, :created_at, :amount_value, :amount_unit, :molfile,
             :purity, :solvent, :impurities, :location, :is_top_secret, :is_restricted, :external_label

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

  class BasePermissionSerializer < ActiveModel::Serializer
    attributes :id, :type, :is_restricted

    def type
      'sample'
    end

    def is_restricted
      true
    end
  end

  class Level0 < BasePermissionSerializer
    attributes :external_label, :molecule

    def molecule
      {
        molecular_weight: object.molecule.molecular_weight
      }
    end
  end

  class Level1 < BasePermissionSerializer
    attributes :external_label, :molfile

    has_one :molecule
  end

  # TODO implement once Analysis feature is finished
  # class Level2
  # class Level3
end
