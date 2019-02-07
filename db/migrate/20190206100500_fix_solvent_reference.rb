class FixSolventReference < ActiveRecord::Migration
  def change
    list = ReactionsSample.where(type: 'ReactionsSolventSample', reference: true)
    list.each do |rs|
      rs.reference = false;
      rs.save!
    end
  end
end
