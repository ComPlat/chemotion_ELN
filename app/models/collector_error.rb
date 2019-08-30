# == Schema Information
#
# Table name: collector_errors
#
#  id         :integer          not null, primary key
#  error_code :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class CollectorError < ActiveRecord::Base
end
