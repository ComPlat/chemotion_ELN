# frozen_string_literal: true

module PubchemHelpers
  def get_cids_from_inchikeys(body)
    inchikey = body.split('=')[1]
    response_hash = {
      PropertyTable: {
        Properties: [
          {
            CID: 123_456_789,
            InChIKey: inchikey
          }
        ]
      }
    }
    response_hash.to_json.to_s
  end

  def xref_from_inchikey
    response_hash = {
      InformationList: {
        Information: [
          {
            CID: 123_456_789,
            RN: [
              '123-456-789',
              '987-654-321',
              '558440-22-5'
            ]
          }
        ]
      }
    }
    response_hash.to_json.to_s
  end
end
