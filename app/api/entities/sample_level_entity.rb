module Entities
  module SampleLevelEntity
    extend ActiveSupport::Concern

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
end
