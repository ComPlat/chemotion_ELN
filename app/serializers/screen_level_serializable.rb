module ScreenLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Screen.new.base_attributes
    has_many :wellplates

    alias_method :original_initialize, :initialize
    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def wellplates
      object.wellplates.map{ |s| "WellplateSerializer::Level#{@nested_dl[:wellplate]}".constantize.new(s, @nested_dl).serializable_hash }
    end

    def type
      'screen'
    end

    def is_restricted
      true
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Screen.new.base_attributes - DetailLevels::Screen.new.public_send("level#{level}_attributes")).each do |attr|
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
