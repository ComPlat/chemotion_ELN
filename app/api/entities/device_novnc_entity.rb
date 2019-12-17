module Entities
  class DeviceNovncEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "device id"}
    expose :name, documentation: { type: "String", desc: "device name" }
    expose :novnc, documentation: { type: "Hash", desc: "device Novnc" }

    def novnc
      result = object.profile.data['novnc'] || {}
      if (token = result.delete('token'))
        if ENV['NOVNC_SECRET'].present?
          token = JWT.encode(
            { 'token': token, exp: (Time.now + 2.seconds).to_i }, ENV['NOVNC_SECRET'], 'HS256'
          )
        end
        result['target'] = "#{result['target']}?token=#{token}"
      end
      result
    end
  end
end
