module SamplePolicySerializable
  extend ActiveSupport::Concern

  included do
    alias_method :original_initialize, :initialize

    def initialize(element, options={})
      original_initialize(element)
      @policy = options.class == Hash && options[:policy]
    end

    def can_update
      @policy && @policy.try(:update?)
    end

    def can_publish
      @policy && @policy.try(:destroy?)
    end
  end
end
