class MigrateDatacollectorAndNovncFields < ActiveRecord::Migration[6.1]
  def up
    Device.all.each do |device|
      profile = Profile.unscoped.where(user_id: device.id).first
      profile_data = profile.present? && profile.data.present?
      datacollector = profile_data && profile.data['method'].present? ? profile.data : device.datacollector_config
      novnc =  profile_data && profile.data['novnc'].present? ? profile.data['novnc'] : device.novnc_settings
      user_level_selected = datacollector['method_params']['user_level_selected'] rescue false
      user_level_value = user_level_selected.present? ? user_level_selected : false

      device.update_columns(
        datacollector_method: (datacollector['method'] rescue nil),
        datacollector_dir: (datacollector['method_params']['dir'] rescue nil),
        datacollector_host: (datacollector['method_params']['host'] rescue nil),
        datacollector_user: (datacollector['method_params']['user'] rescue nil),
        datacollector_authentication: (datacollector['method_params']['authen'] rescue nil),
        datacollector_number_of_files: (datacollector['method_params']['number_of_files'] rescue nil),
        datacollector_key_name: (datacollector['method_params']['key_name'] rescue nil),
        datacollector_user_level_selected: user_level_value,
        novnc_token: (novnc['token'] rescue nil),
        novnc_target: (novnc['target'] rescue nil),
        novnc_password: (novnc['password'] rescue nil),
        account_active: false
      )
    end
    remove_column :devices, :datacollector_config
    remove_column :devices, :novnc_settings
  end

  def down
    add_column :devices, :datacollector_config, :jsonb, default: {}
    add_column :devices, :novnc_settings, :jsonb, default: {}

    Device.all.each do |device|
      datacollector_config = {}
      novnc_settings = {}

      if device.datacollector_method.present?
        datacollector_config = {
          method: device.datacollector_method,
          method_params: {
            dir: device.datacollector_dir,
            host: device.datacollector_host,
            user: device.datacollector_user,
            authen: device.datacollector_authentication,
            number_of_files: device.datacollector_number_of_files,
            key_name: device.datacollector_key_name,
            user_level_selected: device.datacollector_user_level_selected,
          }
        }
      end

      if device.novnc_token.present?
        novnc_settings = {
          token: device.novnc_token,
          target: device.novnc_target,
          password: device.encrypt_novnc_password
        }
      end

      device.update_columns(
        datacollector_config: datacollector_config,
        novnc_settings: novnc_settings,
        datacollector_method: nil,
        datacollector_dir: nil,
        datacollector_host: nil,
        datacollector_user: nil,
        datacollector_authentication: nil,
        datacollector_number_of_files: nil,
        datacollector_key_name: nil,
        datacollector_user_level_selected: false,
        novnc_token: nil,
        novnc_target: nil,
        novnc_password: nil,
        account_active: nil
      )
    end
  end
end
