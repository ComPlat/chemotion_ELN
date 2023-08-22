# frozen_string_literal: true

class SharedMethods
  def order_by_molecule(scope)
    scope.includes(:molecule)
         .joins(:molecule)
         .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
         .order('molecules.sum_formular')
  end

  def pages(total_elements, per_page)
    total_elements.fdiv(per_page).ceil
  end
end
