# frozen_string_literal: true

class Versioning::Reverters::WellplateReverter < Versioning::Reverters::BaseReverter
  # Reverting the grid dimensions here would bypass Wellplate#changeSize's well
  # re-indexing and could orphan or misalign wells that already hold samples.
  FORBIDDEN_FIELDS = %w[width height heigth].freeze

  def self.scope
    Wellplate.with_deleted
  end

  def call
    self.fields = fields.reject { |field| FORBIDDEN_FIELDS.include?(field['name'].to_s) }
    super
  end
end
