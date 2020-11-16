# frozen_string_literal: true

# == Schema Information
#
# Table name: code_logs
#
#  id         :uuid             not null, primary key
#  source     :string
#  source_id  :integer
#  value      :string(40)
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_code_logs_on_source_and_source_id  (source,source_id)
#

class CodeLog < ApplicationRecord
  acts_as_paranoid
  after_create :set_digit_value

  def set_value_xs
    self.value_xs = Chemotion::CodeCreator.create_code_xs
    save!
  end

  def value_sm
    value[1..10]
  end

  private

  def set_digit_value
    self.value = Chemotion::CodeCreator.uuid_to_digit id
    # self.value_sm = Chemotion::CodeCreator.create_code_sm self.value
    save!
  end

  def create_qr_svgs
    if value && value.size == 40
      create_qr_svg
      create_qr_svg 2, :q
    end
  end

  # desc: level = ECC level low, medium, q ,high (:l,:m, :q, :h)
  # desc: version 1 = 21x31, 2 = 25x25
  # see http://www.qrcode.com/en/about/version.html
  def create_qr_svg(version = 1, level = :l)
    qr_code = Barby::QrCode.new(value, size: version, level: level)
    outputter = Barby::SvgOutputter.new(qr_code)
    svg = outputter.to_svg(margin: 0)
    filename = File.join Rails.root, 'public', 'images', 'qr',
                         "#{id}.v#{version}_#{level}.svg"
    File.write filename, svg, mode: 'w'
  end
end
