class CodeLog < ActiveRecord::Base
  scope :bar_code_logs, -> { where(code_type: "bar_code") }
  scope :qr_code_logs, -> { where(code_type: "qr_code") }
  scope :bar_code_bruker_logs, -> { where(code_type: "bar_code_bruker") }

  def self.get_bar_codes
    where(code_type: "bar_code").pluck(:value)
  end

  def self.get_qr_codes
    where(code_type: "qr_code").pluck(:value)
  end

  def self.get_bar_codes_bruker
    where(code_type: "bar_code_bruker").pluck(:value)
  end
end
