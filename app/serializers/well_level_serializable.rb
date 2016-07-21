module WellLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Well.new.base_attributes
    has_one :sample

    alias_method :original_initialize, :initialize
    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def position
      #wrap position_x and y to position object
      {x: object.position_x, y: object.position_y}
    end

    def type
      'well'
    end

    def is_restricted
      true
    end

    def sample
      "SampleSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(object.sample, @nested_dl).serializable_hash
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Well.new.base_attributes - DetailLevels::Well.new.public_send("level#{level}_attributes")).each do |attr|
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
