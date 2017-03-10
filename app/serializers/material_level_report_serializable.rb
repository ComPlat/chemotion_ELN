module MaterialLevelReportSerializable
  extend ActiveSupport::Concern

  included do
    attributes :amount_g, :amount_ml, :amount_mmol,
               :real_amount_g, :real_amount_ml, :real_amount_mmol,
               :preferred_label, :preferred_tag, :get_svg_path

    def amount_g
      object.amount_g
    end

    def amount_ml
      object.amount_ml
    end

    def amount_mmol
      object.amount_mmol
    end

    def real_amount_g
      object.amount_g(:real)
    end

    def real_amount_ml
      object.amount_ml(:real)
    end

    def real_amount_mmol
      object.amount_mmol(:real)
    end

    def preferred_label
      object.preferred_label
    end

    def preferred_tag
      object.preferred_tag
    end

    def get_svg_path
      object.get_svg_path
    end
  end
end
