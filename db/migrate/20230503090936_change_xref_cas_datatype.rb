# frozen_string_literal: true

# rubocop:disable Rails::SkipsModelValidations
# desc: change the data strucure of cas in sample.xref column
class ChangeXrefCasDatatype < ActiveRecord::Migration[6.1]
  def change
    Sample.where(xref: nil).find_each do |sample|
      sample.update_columns(xref: {})
    end

    Sample.where("xref ? 'cas'").find_each do |sample|
      xref = sample.xref
      cas = xref.delete('cas')
      next if cas.present? && cas.is_a?(String)

      xref['cas'] = cas['value'] if cas.is_a?(Hash) && cas['value'].present?

      sample.update_columns(xref: xref)
    end
  end
end

# rubocop:enable Rails::SkipsModelValidations
