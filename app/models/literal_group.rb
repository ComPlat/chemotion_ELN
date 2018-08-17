# frozen_string_literal: true

class LiteralGroup < ActiveRecord::Base
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
