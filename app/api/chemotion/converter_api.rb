# frozen_string_literal: true

module Chemotion
  # Overrides the +/api/v1/converter+ routes that {Labimotion::ConverterAPI}
  # cannot serve, or serves without normalizing. Everything else on that
  # surface (create/delete profile, options, datasets, datasets_units) falls
  # through to the gem, so this API must stay mounted *before*
  # +Labimotion::LabimotionAPI+ in {API}.
  #
  # - +profiles/restore+ and +conversions+ call +Labimotion::Converter.restore+ /
  #   +.test_conversions+, neither of which the gem defines.
  # - +tables+ drops the +ontology+ field that chemotion-converter-client sends
  #   since 0.16.0, which converter-app needs to pick a reader.
  # - +profiles+ GET/PUT relay converter-app's response verbatim. converter-app
  #   only runs its profile-schema migration/validation on write (POST/PUT), so a
  #   profile that predates a schema field (e.g. +tables+) keeps missing it on
  #   read forever. chemotion-converter-client 0.16.0's +ProfileForm+ assumes
  #   every array-typed field is always present and reads several of them
  #   unguarded on mount (+profile.tables.map+ et al.), so a legacy profile
  #   crashes the whole admin page the moment "Edit" is clicked. Backfilled here
  #   with the same defaults the client itself uses for a brand-new profile.
  #
  # Delete the +restore+/+conversions+/+tables+ overrides once the gem
  # implements them; delete the +profiles+ overrides once converter-app
  # migrates/validates on read too.
  class ConverterAPI < Grape::API
    # Array/hash-typed profile fields that chemotion-converter-client 0.16.0
    # always expects present — see AdminApp.js's brand-new-profile defaults.
    PROFILE_ARRAY_KEYS = %w[
      tables identifiers data subjects predicates devices software objects datatypes diff_history
    ].freeze

    # Grape reads error!'s first argument as the body and the second as the
    # status, so a bare error!(401) would answer 500.
    helpers do
      def available?
        @conf = Rails.configuration.try(:converter).try(:url)
        @profile = Rails.configuration.try(:converter).try(:profile)
        error!({ error: 'converter is not configured' }, 406) unless @conf && @profile
      end

      def converter_admin!
        error!({ error: 'unauthorized' }, 401) unless current_user&.converter_admin == true
      end

      # Relays a converter-app failure instead of surfacing it as a 500.
      def with_converter_errors
        yield
      rescue Chemotion::ConverterClient::RequestError => e
        error!({ error: 'converter request failed' }, e.code)
      end

      # The upload arrives as a Rack multipart hash with string keys. Older
      # clients posted it as +file[]+, current ones as a single +file+.
      def uploaded_file
        file = params[:file]
        file = file[0] if file.is_a?(Array)
        error!({ error: 'No file provided.' }, 400) if file.blank?

        file
      end

      # Grape picks its formatter from the Content-Type header before falling back
      # to env['api.format'], so a JSON body has to be handed over as a Hash and
      # re-encoded; anything else is emitted verbatim under an unmapped media type.
      def relay_conversion(response)
        status response.code
        disposition = response.headers['content-disposition']
        header['Content-Disposition'] = disposition if disposition

        media_type = response.headers['content-type'].to_s
        return JSON.parse(response.body) if media_type.include?('json')

        content_type media_type
        env['api.format'] = :binary
        response.body
      end

      # Backfills the array/hash fields chemotion-converter-client 0.16.0 reads
      # unguarded, so a legacy profile missing them doesn't crash the admin UI.
      def normalize_profile(profile)
        return profile unless profile.is_a?(Hash)

        PROFILE_ARRAY_KEYS.each { |key| profile[key] ||= [] }
        profile['subjectInstances'] ||= {}
        profile['reactionVariations'] ||= { 'elements' => [], 'identifiers' => [] }
        profile
      end
    end

    resource :converter do
      before { available? }

      resource :profiles do
        desc 'list profiles, backfilling fields legacy profiles may be missing'
        get do
          profiles = Labimotion::Converter.fetch_profiles || []
          { profiles: profiles.map { |p| normalize_profile(p) }, client: @profile }
        end
      end
    end

    resource :converter do
      before do
        available?
        converter_admin!
      end

      resource :profiles do
        desc 'restore a profile to an earlier version'
        params do
          requires :profile_id, type: String, desc: 'profile id'
          # Not named :version — Grape reserves that for the API version segment.
          requires :profile_version, type: String, desc: 'profile version to restore'
          optional :hard, type: Boolean, default: false, desc: 'discard newer versions'
        end
        # Without the requirement Grape reads the version's dot as a format suffix
        # ("1.0" -> version "1", format "0") and the route never matches.
        post 'restore/:profile_id/:profile_version', requirements: { profile_version: /\d+\.\d+/ } do
          with_converter_errors do
            Chemotion::ConverterClient.restore_profile(
              params[:profile_id],
              params[:profile_version],
              hard: params[:hard],
            )
          end
        end

        route_param :id do
          desc 'update a profile, backfilling fields legacy profiles may be missing'
          put do
            normalize_profile(Labimotion::Converter.update_profile(params))
          end
        end
      end

      resource :tables do
        desc 'create tables'
        post do
          file = uploaded_file
          res = with_converter_errors do
            Chemotion::ConverterClient.create_tables(file['tempfile'], params[:ontology].presence)
          end
          # converter-app only ever sees the tempfile's name.
          res['metadata']['file_name'] = file['filename']
          res
        end
      end

      resource :conversions do
        desc 'convert an uploaded file'
        post do
          file = uploaded_file
          response = with_converter_errors do
            Chemotion::ConverterClient.create_conversion(file['tempfile'], params[:format], params[:ontology].presence)
          end

          relay_conversion(response)
        end
      end
    end
  end
end
