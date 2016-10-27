module CapybaraHelpers
  def find_bs_field(label, selector = 'label')
    find(selector, text: label).find(:xpath, '..').find('input')
  end
end
