# frozen_string_literal: true

module Chemotion
  # Generates MOFid / MOFkey from a CIF file via the external MOF service.
  class MofAPI < Grape::API
    # Match the sidecar MAX_CONTENT_LENGTH (16 MB).
    MAX_CIF_BYTES = 16 * 1024 * 1024

    helpers do
      def mof_service_available!
        error!({ error: 'MOF service is not configured' }, 503) unless MofService.enabled?
      end

      def assert_cif_size!(cif)
        return if cif.bytesize <= MAX_CIF_BYTES

        error!({ error: "CIF exceeds maximum size of #{MAX_CIF_BYTES} bytes" }, 413)
      end
    end

    resource :mof do
      before { authenticate! }

      desc 'Generate MOFid and MOFkey from a CIF file'
      params do
        optional :cif, type: String, desc: 'CIF file contents'
        optional :file, type: File, desc: 'CIF file upload'
        exactly_one_of :cif, :file
      end
      post :analyze do
        mof_service_available!

        cif = params[:cif].presence
        tempfile = nil

        if cif.blank? && params[:file]
          tempfile = params[:file][:tempfile]
          filename = params[:file][:filename].to_s
          error!({ error: 'Uploaded file must be a CIF' }, 400) unless File.extname(filename).downcase == '.cif'
          error!({ error: 'Invalid upload' }, 400) if tempfile.blank?

          # Reject oversized uploads before buffering the whole file into memory.
          error!({ error: "CIF exceeds maximum size of #{MAX_CIF_BYTES} bytes" }, 413) if tempfile.size > MAX_CIF_BYTES

          cif = tempfile.read
        end
        error!({ error: 'No CIF provided' }, 400) if cif.blank?

        assert_cif_size!(cif)

        result = MofService.new(cif).analyze
        error!({ error: 'Failed to analyze CIF' }, 422) if result.blank? || result['mofid'].blank?

        result
      ensure
        if tempfile
          tempfile.close
          tempfile.unlink if tempfile.respond_to?(:unlink)
        end
      end
    end
  end
end
