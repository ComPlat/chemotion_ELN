module ElementLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Element.new.base_attributes
    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def type
      'element'
    end

    def is_restricted
      true
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Element.new.base_attributes - DetailLevels::Element.new.public_send("level#{level}_attributes")).each do |attr|
        define_method(attr) do
          '***'
        end
      end
    end
  end
end
