class MatriceComputedProp < ActiveRecord::Migration[4.2]
  class Matrice < ActiveRecord::Base
  end

  def change
    name =  { name: 'computedProp' }
    Matrice.find_or_create_by(name)&.update(
      enabled: false,
      label: 'computedProp',
      include_ids: [],
      exclude_ids: [],
      configs: {
        allowed_uids: [],
        server: '',
        hmac_secret: '',
        receiving_secret: '',
        parameter_descriptions: {
          allowed_uids: 'allowed list (array of integers) of user ids that can send requests to the computation service',
          server: 'address url of the service',
          hmac_secret: 'authorization key',
          receiving_secret: 'authorization key'
        }
      }
    )
  end
end
