module WellplateLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Wellplate.new.base_attributes
    has_many :wells

    alias_method :original_initialize, :initialize

    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def is_restricted
      true
    end

    def type
      'wellplate'
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Wellplate.new.base_attributes - DetailLevels::Wellplate.new.public_send("level#{level}_attributes")).each do |attr|
        define_method(attr) do
          case attr
          when :analysis_kinds
            nil
          else
            '***'
          end
        end
      end
    end
  end
end
