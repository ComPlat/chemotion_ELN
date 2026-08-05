# frozen_string_literal: true

module Chemotion
  # rubocop:disable Metrics/ClassLength
  class UserAPI < Grape::API
    resource :users do
      desc 'Find top 3 matched user names'
      params do
        requires :name, type: String
        optional :type,
                 type: [String],
                 desc: 'user types',
                 coerce_with: ->(val) { val.split(/[\s|,]+/) },
                 values: %w[Group Person],
                 default: %w[Group Person]
      end
      get 'name' do
        return { users: [] } if params[:name].blank?

        users = User.where(type: params[:type]).by_name(params[:name]).limit(3)
        present users, with: Entities::UserSimpleEntity, root: 'users'
      end

      desc 'Return current_user'
      get 'current' do
        present current_user, with: Entities::UserEntity, root: 'user', with_tokens: true
      end

      resource :two_factor do
        desc 'Get 2FA QR code and status'
        get do
          {
            otp_required_for_login: current_user.otp_required_for_login,
          }
        end

        desc 'Enable 2FA by verifying OTP code'
        put do
          if current_user.otp_required_for_login
            link = OtpWebToken.disable_link(current_user)
            TwoFactorAuthMailer.disable_mail(current_user, link).deliver_now
          else
            link = OtpWebToken.enable_link(current_user)
            TwoFactorAuthMailer.enable_mail(current_user, link).deliver_now
          end

          {
            success: true,
          }
        end
      end

      desc 'list structure editors'
      get 'list_editors' do
        editors = []
        %w[chemdrawEditor marvinjsEditor ketcherEditor].each do |str|
          editors.push(str) if current_user.matrix_check_by_name(str)
        end
        matrices = Matrice.where(name: editors)
                          .order(:name)

        present matrices,
                with: Entities::MatriceEntity,
                root: 'matrices',
                unexpose_include_ids: true,
                unexpose_exclude_ids: true
      end

      namespace :omniauth_providers do
        desc 'get omniauth providers'
        get do
          { providers: Devise.omniauth_configs.keys, current_user: current_user }
        end
      end

      desc "fetch current user's own devices and those of their groups"
      get 'devices' do
        data = [current_user.devices + current_user.groups.map(&:devices)].flatten.uniq
        present data, with: Entities::DeviceEntity, root: 'currentDevices'
      end

      namespace :update_counter do
        desc 'create or update user labels'
        params do
          optional :type, type: String
          optional :counter, type: Integer
        end
        put do
          counters = current_user.counters
          counters[params[:type]] = params[:counter]
          current_user.update(counters: counters)

          present current_user, with: Entities::UserEntity
        end
      end

      namespace :scifinder do
        desc 'scifinder-n credential'
        get do
          present(ScifinderNCredential.find_by(created_by: current_user.id) || {},
                  with: Entities::ScifinderNCredentialEntity)
        end
      end

      namespace :reaction_short_label do
        params do
          requires :reactions_count, type: Integer
          requires :reaction_name_prefix, type: String
        end

        put do
          current_user.reaction_name_prefix = params[:reaction_name_prefix]
          current_user.counters ||= {}
          current_user.counters['reactions'] = params[:reactions_count].to_s
          current_user.save!
        end
      end

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end

      namespace :auth_token do
        desc 'Generate Token'
        params do
          optional :otp_attempt,
                   type: String,
                   desc: 'one time password'
          optional :expires_in_days,
                   type: Integer,
                   default: 30,
                   values: 1..600,
                   desc: 'Token expiration in days (1–600)'
          optional :name, type: String, desc: 'Name of the item'
        end
        post do
          if current_user.otp_required_for_login
            unless current_user.validate_and_consume_otp!(params[:otp_attempt])
              error!({
                       error: 'OTP Missing',
                       otp_required: true,
                       otp_wrong: params[:otp_attempt].present?,
                     }, 422)
            end
          else
            error!('2FA is needed', 401)
          end
          item_name = params[:name].to_s.strip
          item_name = "Token #{Time.current.strftime('%Y%m%d_%H:%M:%S')}" if item_name.empty?
          token = current_user.api_tokens.create!(
            expires_at: params[:expires_in_days].days.from_now,
            name: item_name,
          )

          { token: token.plain_token }
        end
      end

      namespace :revoke_auth_token do
        desc 'Revoke user Auth Token'
        params do
          optional :otp_attempt,
                   type: String,
                   desc: 'one time password'
          requires :id, type: Integer, desc: 'Token ID'
        end

        post do
          if current_user.otp_required_for_login
            unless current_user.validate_and_consume_otp!(params[:otp_attempt])
              error!({
                       error: 'OTP Missing',
                       otp_required: true,
                       otp_wrong: params[:otp_attempt].present?,
                     }, 422)
            end
          else
            error!('2FA is needed', 401)
          end
          token = current_user.api_tokens.find_by(id: params[:id])
          error!('Token not found', 404) unless token
          error!('Token already revoked', 409) if token.revoked_at

          token.revoke!
        end
      end
    end

    resource :devices do
      params do
        optional :id, type: String, regexp: /\d+/, default: '0'
      end

      get :novnc do
        devices = if params[:id] == '0'
                    Device.by_user_ids(user_ids).where.not(novnc_target: nil).group('devices.id').order('devices.name')
                  else
                    Device.by_user_ids(user_ids).where(id: params[:id]).group('devices.id')
                  end
        present devices, with: Entities::DeviceNovncEntity, root: 'devices'
      end

      desc 'Get current connection status for a device'
      params do
        requires :id, type: String, regexp: /\d+/
        optional :status, type: String
      end

      get 'current_connection' do
        # Authorize: ensure device is accessible to current user (cached for 1 minute)
        cache_key = "device_access/#{current_user.id}/#{params[:id]}"

        device = Rails.cache.fetch(cache_key, expires_in: 1.minute) do
          Device.by_user_ids(user_ids).find_by(id: params[:id])
        end

        error!('Device not found', 404) unless device

        path = NOVNC_DEVICES_DIR.join(params[:id])
        status = params[:status] == 'true' ? 1 : 0

        cmd = "echo '#{current_user.id},#{status}' >> #{path};"
        cmd += "LINES=$(tail -n 8 #{path});echo \"$LINES\" | tee #{path}"

        result = Open3.popen3(cmd) { |_i, o, _e, _t| o.read.split(/\s+/) }.compact_blank

        { result: result }
      rescue SystemCallError => e
        Rails.logger.error("current_connection: #{e.class} – #{e.message}")
        error!('Internal server error', 500)
      end

      desc 'Get deviceMetadata for a device accessible to the current user'
      params do
        requires :device_id, type: Integer, desc: 'device id'
      end
      route_param :device_id do
        get 'metadata' do
          device = Device.by_user_ids(user_ids).find_by(id: params[:device_id])
          error!('404 Device not found', 404) unless device

          present device.device_metadata, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
        end
      end
    end
  end

  # rubocop:enable Metrics/ClassLength
end
