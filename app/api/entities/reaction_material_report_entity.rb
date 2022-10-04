# frozen_string_literal: true

module Entities
  # wraps a ReactionsSample object like Entities::ReactionMaterialEntity
  # adds some additional fields for reports
  class ReactionMaterialReportEntity < ReactionMaterialEntity
    with_options(anonymize_below: 0) do
      expose! :amount_g
      expose! :amount_ml
      expose! :amount_mmol
      expose! :get_svg_path
      expose! :preferred_label
      expose! :preferred_tag
      expose! :real_amount_g
      expose! :real_amount_ml
      expose! :real_amount_mmol
    end

    with_options(anonymize_below: 2, anonymize_with: []) do
      expose! :analyses, using: 'Entities::ContainerEntity'
    end

    private

    delegate(
      :amount_g, :amount_ml, :amount_mmol, :analyses, :get_svg_path, :preferred_label, :preferred_tag,
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
