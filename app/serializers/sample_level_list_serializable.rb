module SampleLevelListSerializable
  extend ActiveSupport::Concern

  included do
    has_one :molecule, serializer: MoleculeListSerializer
    has_many :residues, serializer: ResidueSerializer

    [:elemental_compositions].each do |attr|
      define_method(attr) do
        []
      end
    end
  end

  class_methods do
    def list_restricted_methods
      DetailLevels::Sample.new.list_removed_attributes.each do |attr|
        define_method(attr) do
          case attr
          when :analyses, :residues, :elemental_compositions
            []
          when :_contains_residues
            false
          else
            nil
          end
        end
      end
    end
  end
end
