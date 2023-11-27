# frozen_string_literal: true

class CollectorHelperSet
  attr_reader :helper_set

  def initialize(from, cc_list)
    @helper_set = []
    cc_list.each do |cc|
      h = CollectorHelper.new(from, cc)
      @helper_set.push(h) if h.sender_recipient_known?
    end
  end

  def sender_recipient_known?
    @helper_set.length.positive?
  end
end
