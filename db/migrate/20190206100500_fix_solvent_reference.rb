class FixSolventReference < ActiveRecord::Migration[4.2]
  class ReactionsSample < ActiveRecord::Base
  end

  def change
    list = ReactionsSample.where(type: 'ReactionsSolventSample', reference: true)
    list.each do |rs|
      rs.reference = false;
      rs.save!
    end
  end
end
