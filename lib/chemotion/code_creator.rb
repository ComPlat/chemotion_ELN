module Chemotion::CodeCreator

  class << self
    def uuid_to_digit(uuid=SecureRandom.uuid)
      format '%040i',uuid.delete("-").to_i(16)
    end

    def digit_to_uuid(d40)
      hex = d40.to_i.to_s(16)
      "%s-%s-%s-%s-%s" % [hex[0..7], hex[8..11], hex[12..15], hex[16..19], hex[20..31]]
    end

    def self.create_code_xs
      #TODO
      all_xs_codes = CodeLog.all.pluck :value_xs
      begin
        xs_code = rand.to_s[2..7]
      end while all_bruker_codes.include?(bruker_code)
      xs_code
    end

    def create_code_sm(value=rand.to_s)
      value[1..10]
    end
  end

end
