# frozen_string_literal: true

# General Utils library
module Utils
  def self.most_occurance(arr)
    arr.group_by(&:to_s).values.max_by(&:size).try(:first)
  end
end
