module Chemotion::CodeCreator
  def self.create_bar_code
    all_bar_codes = CodeLog.get_bar_codes

    begin
      # this generates a 8 digit number string
      bar_code = rand.to_s[2..9]
    end while all_bar_codes.include?(bar_code)

    bar_code
  end

  def self.create_qr_code
    all_qr_codes = CodeLog.get_qr_codes

    begin
      qr_code = rand.to_s[2..9]
    end while all_qr_codes.include?(qr_code)

    qr_code
  end

  def self.create_bar_code_bruker
    all_bar_codes_bruker = CodeLog.get_bar_codes_bruker

    begin
      bar_code_bruker = rand.to_s[2..7]
    end while all_bar_codes_bruker.include?(bar_code_bruker)

    bar_code_bruker
  end
end
