require 'omniauth-orcid'
require 'ruby_dig'

module OmniAuth
  module Strategies
    class ChemotionORCID < OmniAuth::Strategies::ORCID

      def api_base_url
        site + "/v#{API_VERSION}"
      end

      info do
        {
          email: raw_info[:email],
          first_name: raw_info[:first_name],
          last_name: raw_info[:last_name],
          employments: raw_info[:employments]
        }
      end

      def request_info
        @request_info ||= access_token.get( "#{api_base_url}/#{uid}/record", headers: { accept: 'application/json' } ).parsed || {}
      end

      def raw_info
        @raw_info ||= {
          first_name: request_info.dig('person', 'name', 'given-names', 'value'),
          last_name: request_info.dig('person', 'name', 'family-name', 'value'),
          email: request_info.dig('person', 'emails', 'email')
            .select { |e| e.fetch('verified') }.find { |e| e.fetch('primary') }.to_h.fetch('email', nil),
          employments: request_info.dig('activities-summary', 'employments', 'employment-summary').map do |e|
            { 'organization' => e.dig('organization', 'name'),
              'country' => e.dig('organization', 'address', 'country'),
              'department-name' => e.fetch('department-name', nil) }
          end
        }
      end

      def callback_url
        options.redirect_uri || (full_host + script_name + callback_path)
      end
    end
  end
end

OmniAuth.config.add_camelization 'chemotion_orcid', 'ChemotionORCID'
