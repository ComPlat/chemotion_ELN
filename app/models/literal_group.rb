# frozen_string_literal: true

# == Schema Information
#
# Table name: literal_groups
#
#  element_type       :string(40)
#  element_id         :integer
#  literature_id      :integer
#  category           :string(40)
#  count              :bigint
#  title              :string
#  doi                :string
#  url                :string
#  refs               :jsonb
#  short_label        :string
#  name               :string
#  external_label     :string
#  element_updated_at :datetime
#


class LiteralGroup < ApplicationRecord
  scope :by_element_ids_and_cat, ->(s_ids, r_ids, cats) {
    sql_arr = []
    sql_arr << "(element_type = 'Sample' and element_id in (#{s_ids.join(',')}))" if s_ids.present?
    sql_arr << "(element_type = 'Reaction' and element_id in (#{r_ids.join(',')}))" if r_ids.present?
    sql = sql_arr.join(' or ')
    if sql.present?
      where(sql).where(category: cats)
    else
      none
    end
  }

  def readonly?
    true
  end
end
