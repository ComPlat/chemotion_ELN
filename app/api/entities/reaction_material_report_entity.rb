# frozen_string_literal: true

module Entities
  # wraps a ReactionsSample object like Entities::ReactionMaterialEntity
  # adds some additional fields for reports
  class ReactionMaterialReportEntity < ReactionMaterialEntity
    expose! :amount_g
    expose! :amount_ml
    expose! :amount_mmol
    expose! :get_svg_path
    expose! :preferred_label
    expose! :preferred_tag
    expose! :real_amount_g
    expose! :real_amount_ml
    expose! :real_amount_mmol

    # This entity does not wrap a sample but a ReactionsSample instance
    # Therefore we cannot use anonymize_below (it would check detail_levels[ReactionsSample] or one of its
    # polymorphic subclasses). Instead we do the check manually in the #analyses method below
    expose! :analyses, using: 'Entities::ContainerEntity'

    private

    delegate(
      :amount_g, :amount_ml, :amount_mmol, :get_svg_path, :preferred_label, :preferred_tag,
      to: :"object.sample"
    )

    def analyses
      return [] if detail_levels[Sample] < 2

      object.sample.analyses
    end

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
