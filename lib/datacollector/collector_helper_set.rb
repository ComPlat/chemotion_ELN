class CollectorHelperSet
  attr_reader :helper_set

  def initialize(from, cc_list)
    @helper_set = []
    for cc in cc_list do
      h = CollectorHelper.new(from, cc)
      @helper_set.push(h) if h.sender_recipient_known?
    end
  end

  def sender_recipient_known?
    @helper_set.length.positive?
  end
end
