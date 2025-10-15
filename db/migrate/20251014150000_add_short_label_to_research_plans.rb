# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations

class AddShortLabelToResearchPlans < ActiveRecord::Migration[6.1]
  def up
    add_column :research_plans, :short_label, :string

    User.find_each do |u|
      plans = ResearchPlan.where(created_by: u.id).order(:created_at)

      plans.each_with_index do |rp, index|
        counter = index + 1
        rp.update_column('short_label', "#{u.name_abbreviation}-RP#{counter}")
      end

      if u.respond_to?(:counters)
        u.counters ||= {}
        u.counters['research_plans'] = plans.size.to_s
        u.save!
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

# rubocop:enable Rails/SkipsModelValidations
