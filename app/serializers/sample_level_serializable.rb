module SampleLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Sample.new.base_attributes
    has_one :molecule
    has_many :residues, serializer: ResidueSerializer
    has_many :elemental_compositions, serializer: ElementalCompositionSerializer
    has_one :container, serializer: ContainerSerializer
    has_one :tag

    alias_method :policy_initialize, :initialize

    def initialize(element, options={})
      policy_initialize(element, options)
    end

    def type
      'sample'
    end

    def is_restricted
      true
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Sample.new.base_attributes - DetailLevels::Sample.new.public_send("level#{level}_attributes")).each do |attr|
        define_method(attr) do
          case attr
          when :analyses, :residues, :elemental_compositions, :molecule_computed_props
            []
          when :_contains_residues
            false
          when :container
            nil
          when :molecule_name_hash
            {}
          else
            '***'
          end
        end
      end
    end
  end
end
