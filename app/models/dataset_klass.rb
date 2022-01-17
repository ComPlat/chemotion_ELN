# frozen_string_literal: true

# == Schema Information
#
# Table name: dataset_klasses
#
#  id                  :integer          not null, primary key
#  ols_term_id         :string           not null
#  label               :string           not null
#  desc                :string
#  properties_template :jsonb            not null
#  is_active           :boolean          default(FALSE), not null
#  place               :integer          default(100), not null
#  created_by          :integer          not null
#  created_at          :datetime         not null
#  updated_at          :datetime
#  deleted_at          :datetime
#  uuid                :string
#  properties_release  :jsonb
#  released_at         :datetime
#
class DatasetKlass < ApplicationRecord
  acts_as_paranoid
  include GenericKlassRevisions
  has_many :datasets, dependent: :destroy
  has_many :dataset_klasses_revisions, dependent: :destroy

  def self.init_seeds
    seeds_path = File.join(Rails.root, 'db', 'seeds', 'json', 'dataset_klasses.json')
    seeds = JSON.parse(File.read(seeds_path))

    seeds['chmo'].each do |term|
      next if DatasetKlass.where(ols_term_id: term['id']).count.positive?

      attributes = { ols_term_id: term['id'], label: "#{term['label']} (#{term['synonym']})", desc: "#{term['label']} (#{term['synonym']})", place: term['position'], created_by: Admin.first&.id || 0 }
      DatasetKlass.create!(attributes)
    end
    true
  end
end
