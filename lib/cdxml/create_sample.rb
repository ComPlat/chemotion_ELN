module Cdxml
  class CreateSample < Creator
    attr_accessor :sample
    def initialize(args)
      super
      @sample = args[:sample]
    end

    def to_cdxml
      spl, _ = samples_cdxml([sample], X_SHIFT, Y_SHIFT, "sample")
      merge(spl)
    end
  end
end
