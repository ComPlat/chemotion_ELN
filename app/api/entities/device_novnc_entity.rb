# frozen_string_literal: true

module Entities
  class DeviceNovncEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: 'device id' }
    expose :name, documentation: { type: 'String', desc: 'device name' }
    expose :target, documentation: { type: 'String', desc: 'device Novnc target' }
    expose :password, documentation: { type: 'String', desc: 'device Novnc password' }

    def target
      target = object.novnc_target
      if (token = object.novnc_token)
        if ENV['NOVNC_SECRET'].present?
          token = JWT.encode(
            { token: token, exp: 2.seconds.from_now.to_i }, ENV['NOVNC_SECRET'], 'HS256'
          )
        end
        target = "#{target}?token=#{token}"
      end
      target
    end

    def password
      object.decrypted_novnc_password
    end
  end
end
