class CodeLog < ActiveRecord::Base
  acts_as_paranoid
  after_create  :set_digit_value

  def set_value_xs
    self.value_xs = Chemotion::CodeCreator.create_code_xs
    save!
  end

  def value_sm() self.value[1..10] end

  private

  def set_digit_value
    self.value = Chemotion::CodeCreator.uuid_to_digit self.id
    #self.value_sm = Chemotion::CodeCreator.create_code_sm self.value
    save!
  end

  def create_qr_svgs
    if self.value && self.value.size == 40
      create_qr_svg
      create_qr_svg 2, :q
    end
  end

  #desc: level = ECC level low, medium, q ,high (:l,:m, :q, :h)
  #desc: version 1 = 21x31, 2 = 25x25
  # see http://www.qrcode.com/en/about/version.html
  def create_qr_svg(version=1,level= :l)
    qr_code = Barby::QrCode.new(self.value, size: version, level: level)
    outputter = Barby::SvgOutputter.new(qr_code)
    svg = outputter.to_svg(margin:0)
    filename = File.join Rails.root, "public", "images", "qr",
      "#{self.id}.v#{version}_#{level.to_s}.svg"
    File.write filename,svg, mode: "w"
  end

end
