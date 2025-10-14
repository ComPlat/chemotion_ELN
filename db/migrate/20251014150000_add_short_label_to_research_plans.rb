class AddShortLabelToResearchPlans < ActiveRecord::Migration[6.1]
  def up
    add_column :research_plans, :short_label, :string

    ResearchPlan.order(:created_at).group_by(&:created_by).each do |user_id, plans|
      user = User.find_by(id: user_id)
      next unless user

      plans.each_with_index do |rp, index|
        counter = index + 1
        rp.update!(short_label: "#{user.name_abbreviation}-RP#{counter}")
      end

      if user.respond_to?(:counters)
        user.counters ||= {}
        user.counters['research_plans'] = plans.size.to_s
        user.save!
      end
    end
  end

  def down
    remove_column :research_plans, :short_label

    User.find_each do |user|
      if user.respond_to?(:counters) && user.counters.is_a?(Hash)
        user.counters.delete('research_plans')
        user.save!
      end
    end
  end
end
