module SampleLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Sample.new.base_attributes
    has_one :molecule
    has_many :residues
    has_many :elemental_compositions
    has_one :container

    alias_method :original_initialize, :initialize

    def initialize(element, nested_detail_levels)
      original_initialize(element)
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
          when :analyses, :residues, :elemental_compositions
            []
          when :_contains_residues
            false
          when :analysis_kinds
            nil
          when :container
            nil
          else
            '***'
          end
        end
      end
    end
  end
end
