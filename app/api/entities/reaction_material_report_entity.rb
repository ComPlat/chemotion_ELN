# frozen_string_literal: true

module Entities
  # wraps a ReactionsSample object like Entities::ReactionMaterialEntity
  # adds some additional fields for reports
  class ReactionMaterialReportEntity < ReactionMaterialEntity
    SAMPLE_ENTITY = 'Entities::SampleReportEntity'.freeze

    expose(
      :amount_g,
      :amount_ml,
      :amount_mmol,
      :get_svg_path,
      :preferred_label,
      :preferred_tag,
      :real_amount_g,
      :real_amount_ml,
      :real_amount_mmol,
    )

    private

    delegate(
      :amount_g, :amount_ml, :amount_mmol, :get_svg_path, :preferred_label, :preferred_tag,
      to: :"object.sample"
    )

    def real_amount_g
      object.sample.amount_g(:real)
    end

    def real_amount_ml
      object.sample.amount_ml(:real)
    end

    def real_amount_mmol
      object.sample.amount_mmol(:real)
    end
  end
end
