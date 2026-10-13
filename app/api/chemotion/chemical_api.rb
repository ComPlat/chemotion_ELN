# frozen_string_literal: true

module Chemotion
  class ChemicalAPI < Grape::API
    include Grape::Kaminari
    resource :chemicals do
      desc 'update chemicals'
      params do
        requires :chemical_data, type: Array[Hash], desc: 'chemical data'
        optional :cas, type: String, desc: 'cas number'
        optional :sample_id, type: Integer
        optional :sequence_based_macromolecule_sample_id, type: Integer
        exactly_one_of :sample_id, :sequence_based_macromolecule_sample_id
      end
      put do
        Chemotion::ChemicalsService.handle_exceptions do
          attributes = declared(params, include_missing: false)
          if params[:chemical_data].present? || params[:cas].present?
            chemical = if params[:sequence_based_macromolecule_sample_id]
                         attributes[:sample_id] = nil
                         Chemical.find_by(
                           sequence_based_macromolecule_sample_id: params[:sequence_based_macromolecule_sample_id],
                         )
                       else
                         attributes[:sequence_based_macromolecule_sample_id] = nil
                         Chemical.find_by(sample_id: params[:sample_id])
                       end
            error!('chemical not found', 404) unless chemical
            chemical.update!(attributes)
          else
            status 204
          end
        end
      end

      desc 'Return chemical by sample_id or sequence_based_macromolecule_sample_id'
      params do
        optional :sample_id, type: Integer, desc: 'sample id'
        optional :sequence_based_macromolecule_sample_id, type: Integer, desc: 'sequence based macromolecule id'
        exactly_one_of :sample_id, :sequence_based_macromolecule_sample_id
      end

      get do
        Chemotion::ChemicalsService.handle_exceptions do
          if params[:sequence_based_macromolecule_sample_id]
            Chemical.find_by(
              sequence_based_macromolecule_sample_id: params[:sequence_based_macromolecule_sample_id],
            ) || Chemical.new
          else
            Chemical.find_by(sample_id: params[:sample_id]) || Chemical.new
          end
        end
      end

      resource :create do
        desc 'Create a Chemical Entry'
        params do
          requires :chemical_data, type: Array[Hash], desc: 'chemical data'
          requires :cas, type: String
          optional :sample_id, type: Integer
          optional :sequence_based_macromolecule_sample_id, type: Integer
          exactly_one_of :sample_id, :sequence_based_macromolecule_sample_id
        end

        post do
          Chemotion::ChemicalsService.handle_exceptions do
            attributes = declared(params, include_missing: false) || {}
            if params[:sequence_based_macromolecule_sample_id]
              attributes[:sample_id] = nil
              attributes[:sequence_based_macromolecule_sample_id] = params[:sequence_based_macromolecule_sample_id]
            else
              attributes[:sequence_based_macromolecule_sample_id] = nil
              attributes[:sample_id] = params[:sample_id]
            end
            Chemical.create!(attributes)
          end
        end
      end

      resource :fetch_safetysheet do
        desc 'fetch safety data sheet'
        route_param :id do
          params do
            requires :data, type: Hash, desc: 'params'
          end
          get do
            Chemotion::ChemicalsService.handle_exceptions do
              data = params[:data]
              molecule = Molecule.find(params[:id]) if params[:id] != 'null'
              vendor = data[:vendor]
              language = data[:language]
              # A product number narrows the vendor listing; PubChem is still reached by
              # the molecule, so a name or CAS is needed either way.
              name = data[:searchStr].presence ||
                     (data[:option] == 'Common Name' ? molecule&.names&.first : molecule&.cas&.first)
              number = data[:productNumber]
              case vendor
              when 'Merck', 'Sigma-Aldrich'
                { merck_link: Chemotion::ChemicalsService.merck(name, language, number) }
              when 'Thermofisher'
                { alfa_link: Chemotion::ChemicalsService.thermofisher(name, language, number) }
              when 'All'
                Chemotion::ChemicalsService.vendor_overview(name, language, number)
              else
                {
                  alfa_link: Chemotion::ChemicalsService.thermofisher(name, language, number),
                  merck_link: Chemotion::ChemicalsService.merck(name, language, number),
                }
              end
            end
          end
        end
      end

      resource :save_safety_datasheet do
        desc 'save safety data sheet'

        params do
          requires :sample_id, type: Integer, desc: 'sample id'
          requires :cas, type: String
          requires :chemical_data, type: Array[Hash]
          optional :vendor_product, type: String
        end
        post do
          result = Chemotion::ChemicalsService.handle_exceptions do
            Chemotion::ChemicalsService.save_vendor_sheet(
              sample_id: params[:sample_id],
              cas: params[:cas],
              chemical_data: params[:chemical_data],
              product_info: params[:chemical_data].first.try(:[], params[:vendor_product]),
            )
          end
          if result.is_a?(Hash) && result[:error].present?
            error!({ error: result[:error], final: result[:final] }, result[:status] || 400)
          end

          result
        end
      end

      resource :save_manual_sds do
        desc 'save attached safety data sheet'
        params do
          requires :sample_id, type: Integer, desc: 'Sample ID'
          optional :cas, type: String, desc: 'CAS number'
          requires :vendor_info, type: String, desc: 'Vendor info as JSON string'
          requires :vendor_name, type: String, desc: 'Vendor name'
          requires :attached_file, type: File, desc: 'Attached file (SDS document)'
          requires :vendor_product, type: String, desc: 'Vendor product info key'
          optional :chemical_data, type: String, desc: 'Chemical data as JSON string'
        end

        post do
          result = Chemotion::ManualSdsService.create_manual_sds(
            sample_id: params[:sample_id],
            cas: params[:cas],
            vendor_info: params[:vendor_info],
            vendor_name: params[:vendor_name],
            vendor_product: params[:vendor_product],
            attached_file: params[:attached_file],
            chemical_data: params[:chemical_data],
          )

          if result.is_a?(Hash) && result[:error].present?
            error!({ error: result[:error], final: result[:final] }, result[:status] || 400)
          else
            # Return the created/updated chemical
            present result
          end
        rescue StandardError => e
          Rails.logger.error("Error in save_manual_sds: #{e.message}")
          error!({ error: "Internal server error: #{e.message}" }, 500)
        end
      end

      resources :extract_sds do
        desc 'Read H and P codes and section 9 properties out of a saved safety data sheet'

        params do
          requires :path, type: String, desc: 'safetySheetPath link of the saved sheet'
        end

        helpers do
          # A failure of the PDF text service is a 503, with Retry-After when it gave one; of the sheet, a 422.
          def answer_sds_extraction(result)
            diagnostics = result['diagnostics']
            failure = diagnostics&.dig('errors')&.first
            return result unless failure

            if diagnostics['service_unavailable']
              retry_after = Chemotion::SdsExtractionCache.retry_after(diagnostics)
              error!({ error: failure, diagnostics: diagnostics }, 503,
                     retry_after ? { 'Retry-After' => retry_after.to_s } : {})
            end
            error!({ error: failure, diagnostics: diagnostics }, 422)
          end
        end

        # 400 not a saved sheet, 404 gone, 202 while SdsExtractionJob reads it, then the cached
        # result: 200, or the failure as answer_sds_extraction maps it.
        get do
          path = Chemotion::SdsExtractor.saved_sheet_path(params[:path])
          error!({ error: Chemotion::SdsExtractor::NOT_A_SAVED_SHEET }, 400) if path.nil?
          error!({ error: 'the safety data sheet is no longer on the server' }, 404) unless path.file?

          key = Chemotion::SdsExtractionCache.key(path)
          result = Chemotion::SdsExtractionCache.read(key)
          next answer_sds_extraction(result) if result

          SdsExtractionJob.perform_later(params[:path], key) unless SdsExtractionJob.pending?(key)
          status 202
          { status: 'pending' }
        rescue StandardError => e
          Rails.logger.error("extract_sds failed: #{e.class}: #{e.message}")
          error!({ error: 'the safety data sheet could not be read' }, 500)
        end
      end
    end
  end
end
