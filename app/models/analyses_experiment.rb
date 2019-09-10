# == Schema Information
#
# Table name: analyses_experiments
#
#  id                  :integer          not null, primary key
#  sample_id           :integer
#  holder_id           :integer
#  status              :string
#  devices_analysis_id :integer          not null
#  devices_sample_id   :integer          not null
#  sample_analysis_id  :string           not null
#  solvent             :string
#  experiment          :string
#  priority            :boolean
#  on_day              :boolean
#  number_of_scans     :integer
#  sweep_width         :integer
#  time                :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

class AnalysesExperiment < ActiveRecord::Base
  belongs_to :sample
  belongs_to :devices_analysis
end
