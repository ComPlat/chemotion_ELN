# frozen_string_literal: true

# Job to update molecule info(molecule tag) for molecules with no chemrepo_id if
# inchikey found in ChemotionRepository
class ChemrepoIdJob < ApplicationJob
  queue_as :chemrepo_id_job

  def perform(
    url = 'https://www.chemotion-repository.net',
    req_headers = { 'Content-Type' => 'application/json' },
    batch_size = 50
  )
    @url = url
    @req_headers = req_headers
    @connection = Faraday.new(url: @url, headers: @req_headers)
    @resp = @connection.get('/api/v1/public/ping')
    if @resp.success?
      @molecules = Molecule.where('molecules.inchikey is not null and molecules.id in ' \
                                  '(select taggable_id from element_tags where ' \
                                  "taggable_type = 'Molecule' and " \
                                  "taggable_data->>'chemrepo_id' is null) ")
                           .where('molecules.id in (select molecule_id from samples ' \
                                  'where deleted_at is null) ')
                           .find_in_batches(batch_size: batch_size) { |batch|
        batch.each do |mol|
          chemrepo_id = transfer_data(mol)
          next if chemrepo_id.blank?

          update_element_tag(mol_id: mol.id, chemrepo_id: chemrepo_id)
        end
      }
    end
    true
  end

  def transfer_data(element)
    req_params = { inchikey: element.inchikey }
    @resp = @connection.post('api/v1/public/search') { |req|
      req.body = req_params.to_json
    }
    if @resp.success?
      JSON.parse(@resp.body)['molecule_id']
    else
      Delayed::Worker.logger.error  <<~TXT
        --------- chemorepo id FAIL message.BEGIN ------------
        resp status:  #{@resp.status}
        inchikey: #{element.inchikey}
        --------- chemorepo id FAIL message.END ---------------
      TXT
      nil
    end
  rescue StandardError => e
    Delayed::Worker.logger.error e
    nil
  end

  def update_element_tag(params)
    ElementTag.where("taggable_id = ? AND taggable_type = 'Molecule' ", params[:mol_id])
              .update_all('taggable_data = jsonb_set(taggable_data, ' \
              "'{chemrepo_id}', to_json(#{params[:chemrepo_id]}::int)::jsonb, true) ")
  end
end
