# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20160427132049) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"
  enable_extension "pg_trgm"
  enable_extension "hstore"

  create_table "authentication_keys", force: :cascade do |t|
    t.string "token", null: false
  end

  create_table "baskets", force: :cascade do |t|
    t.integer  "user_id",    null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string   "name"
  end

  add_index "baskets", ["user_id"], name: "index_baskets_on_user_id", using: :btree

  create_table "baskets_fruits", force: :cascade do |t|
    t.integer "basket_id"
    t.integer "fruit_id"
    t.string  "category"
  end

  add_index "baskets_fruits", ["basket_id"], name: "index_baskets_fruits_on_basket_id", using: :btree

  create_table "chemstash_chemicals", force: :cascade do |t|
    t.string   "substance"
    t.string   "location"
    t.string   "current_location"
    t.text     "molfile"
    t.string   "acronym"
    t.string   "additional_acronym"
    t.string   "status"
    t.string   "cas"
    t.string   "supplier"
    t.string   "catalogue_year"
    t.string   "ordering_number"
    t.float    "quantity"
    t.string   "unit"
    t.float    "price"
    t.string   "currency",           default: "euro"
    t.time     "ordered_at"
    t.string   "bill"
    t.string   "danger_sign"
    t.string   "safety_statement"
    t.string   "risk_statement"
    t.text     "note"
    t.hstore   "label"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
  end

  create_table "chemstash_chemicals_molecules", id: false, force: :cascade do |t|
    t.integer "chemstash_chemical_id"
    t.integer "molecule_id"
  end

  add_index "chemstash_chemicals_molecules", ["chemstash_chemical_id"], name: "index_chemstash_chemicals_molecules_on_chemstash_chemical_id", using: :btree
  add_index "chemstash_chemicals_molecules", ["molecule_id"], name: "index_chemstash_chemicals_molecules_on_molecule_id", using: :btree

  create_table "chemstash_chemicals_orders", id: false, force: :cascade do |t|
    t.integer "chemstash_chemical_id"
    t.integer "chemstash_orders_id"
  end

  add_index "chemstash_chemicals_orders", ["chemstash_chemical_id"], name: "index_chemstash_chemicals_orders_on_chemstash_chemical_id", using: :btree
  add_index "chemstash_chemicals_orders", ["chemstash_orders_id"], name: "index_chemstash_chemicals_orders_on_chemstash_orders_id", using: :btree

  create_table "chemstash_chemicals_statements", id: false, force: :cascade do |t|
    t.integer "chemstash_chemical_id"
    t.integer "chemstash_statement_id"
  end

  add_index "chemstash_chemicals_statements", ["chemstash_chemical_id"], name: "index_chemstash_chemicals_statements_on_chemstash_chemical_id", using: :btree
  add_index "chemstash_chemicals_statements", ["chemstash_statement_id"], name: "index_chemstash_chemicals_statements_on_chemstash_statement_id", using: :btree

  create_table "chemstash_orders", force: :cascade do |t|
    t.string   "supplier"
    t.string   "catalogue_year"
    t.string   "ordering_number"
    t.float    "quantity"
    t.string   "unit"
    t.float    "price"
    t.string   "currency",        default: "euro"
    t.time     "ordered_at"
    t.string   "ordered_by"
    t.string   "ordered_for"
    t.string   "bill"
    t.datetime "created_at",                       null: false
    t.datetime "updated_at",                       null: false
  end

  create_table "chemstash_statements", force: :cascade do |t|
    t.string   "acronym"
    t.text     "statement"
    t.string   "type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "collections", force: :cascade do |t|
    t.integer  "user_id",                                null: false
    t.string   "ancestry"
    t.text     "label",                                  null: false
    t.integer  "shared_by_id"
    t.boolean  "is_shared",              default: false
    t.integer  "permission_level",       default: 0
    t.integer  "sample_detail_level",    default: 10
    t.integer  "reaction_detail_level",  default: 10
    t.integer  "wellplate_detail_level", default: 10
    t.datetime "created_at",                             null: false
    t.datetime "updated_at",                             null: false
    t.integer  "position"
    t.integer  "screen_detail_level",    default: 10
    t.boolean  "is_locked",              default: false
    t.datetime "deleted_at"
  end

  add_index "collections", ["ancestry"], name: "index_collections_on_ancestry", using: :btree
  add_index "collections", ["deleted_at"], name: "index_collections_on_deleted_at", using: :btree
  add_index "collections", ["user_id"], name: "index_collections_on_user_id", using: :btree

  create_table "collections_reactions", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "reaction_id"
    t.datetime "deleted_at"
  end

  add_index "collections_reactions", ["collection_id"], name: "index_collections_reactions_on_collection_id", using: :btree
  add_index "collections_reactions", ["deleted_at"], name: "index_collections_reactions_on_deleted_at", using: :btree
  add_index "collections_reactions", ["reaction_id"], name: "index_collections_reactions_on_reaction_id", using: :btree

  create_table "collections_samples", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "sample_id"
    t.datetime "deleted_at"
  end

  add_index "collections_samples", ["collection_id"], name: "index_collections_samples_on_collection_id", using: :btree
  add_index "collections_samples", ["deleted_at"], name: "index_collections_samples_on_deleted_at", using: :btree
  add_index "collections_samples", ["sample_id"], name: "index_collections_samples_on_sample_id", using: :btree

  create_table "collections_screens", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "screen_id"
    t.datetime "deleted_at"
  end

  add_index "collections_screens", ["collection_id"], name: "index_collections_screens_on_collection_id", using: :btree
  add_index "collections_screens", ["deleted_at"], name: "index_collections_screens_on_deleted_at", using: :btree
  add_index "collections_screens", ["screen_id"], name: "index_collections_screens_on_screen_id", using: :btree

  create_table "collections_wellplates", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "wellplate_id"
    t.datetime "deleted_at"
  end

  add_index "collections_wellplates", ["collection_id"], name: "index_collections_wellplates_on_collection_id", using: :btree
  add_index "collections_wellplates", ["deleted_at"], name: "index_collections_wellplates_on_deleted_at", using: :btree
  add_index "collections_wellplates", ["wellplate_id"], name: "index_collections_wellplates_on_wellplate_id", using: :btree

  create_table "delayed_jobs", force: :cascade do |t|
    t.integer  "priority",   default: 0, null: false
    t.integer  "attempts",   default: 0, null: false
    t.text     "handler",                null: false
    t.text     "last_error"
    t.datetime "run_at"
    t.datetime "locked_at"
    t.datetime "failed_at"
    t.string   "locked_by"
    t.string   "queue"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "delayed_jobs", ["priority", "run_at"], name: "delayed_jobs_priority", using: :btree

  create_table "elemental_compositions", force: :cascade do |t|
    t.integer  "sample_id",                     null: false
    t.string   "composition_type",              null: false
    t.hstore   "data",             default: {}, null: false
    t.float    "loading"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "elemental_compositions", ["sample_id"], name: "index_elemental_compositions_on_sample_id", using: :btree

  create_table "literatures", force: :cascade do |t|
    t.integer  "reaction_id", null: false
    t.string   "title"
    t.string   "url"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
    t.datetime "deleted_at"
  end

  add_index "literatures", ["deleted_at"], name: "index_literatures_on_deleted_at", using: :btree
  add_index "literatures", ["reaction_id"], name: "index_literatures_on_reaction_id", using: :btree

  create_table "molecules", force: :cascade do |t|
    t.string   "inchikey"
    t.string   "inchistring"
    t.float    "density"
    t.float    "molecular_weight"
    t.binary   "molfile"
    t.float    "melting_point"
    t.float    "boiling_point"
    t.string   "sum_formular"
    t.string   "names",                  default: [],                 array: true
    t.string   "iupac_name"
    t.string   "molecule_svg_file"
    t.datetime "created_at",                             null: false
    t.datetime "updated_at",                             null: false
    t.datetime "deleted_at"
    t.boolean  "is_partial",             default: false, null: false
    t.float    "exact_molecular_weight"
  end

  add_index "molecules", ["deleted_at"], name: "index_molecules_on_deleted_at", using: :btree
  add_index "molecules", ["inchikey", "is_partial"], name: "index_molecules_on_inchikey_and_is_partial", unique: true, using: :btree

  create_table "pg_search_documents", force: :cascade do |t|
    t.text     "content"
    t.integer  "searchable_id"
    t.string   "searchable_type"
    t.datetime "created_at",      null: false
    t.datetime "updated_at",      null: false
  end

  add_index "pg_search_documents", ["searchable_type", "searchable_id"], name: "index_pg_search_documents_on_searchable_type_and_searchable_id", using: :btree

  create_table "reactions", force: :cascade do |t|
    t.string   "name"
    t.datetime "created_at",                             null: false
    t.datetime "updated_at",                             null: false
    t.text     "description"
    t.string   "timestamp_start"
    t.string   "timestamp_stop"
    t.text     "observation"
    t.string   "purification",       default: [],                     array: true
    t.string   "dangerous_products", default: [],                     array: true
    t.string   "tlc_solvents"
    t.text     "tlc_description"
    t.string   "rf_value"
    t.string   "temperature",        default: "21.0 °C"
    t.string   "status"
    t.string   "reaction_svg_file"
    t.string   "solvent"
    t.datetime "deleted_at"
  end

  add_index "reactions", ["deleted_at"], name: "index_reactions_on_deleted_at", using: :btree

  create_table "reactions_product_samples", force: :cascade do |t|
    t.integer  "reaction_id"
    t.integer  "sample_id"
    t.boolean  "reference"
    t.float    "equivalent"
    t.datetime "deleted_at"
  end

  add_index "reactions_product_samples", ["deleted_at"], name: "index_reactions_product_samples_on_deleted_at", using: :btree
  add_index "reactions_product_samples", ["reaction_id"], name: "index_reactions_product_samples_on_reaction_id", using: :btree
  add_index "reactions_product_samples", ["sample_id"], name: "index_reactions_product_samples_on_sample_id", using: :btree

  create_table "reactions_reactant_samples", force: :cascade do |t|
    t.integer  "reaction_id"
    t.integer  "sample_id"
    t.boolean  "reference"
    t.float    "equivalent"
    t.datetime "deleted_at"
  end

  add_index "reactions_reactant_samples", ["deleted_at"], name: "index_reactions_reactant_samples_on_deleted_at", using: :btree
  add_index "reactions_reactant_samples", ["reaction_id"], name: "index_reactions_reactant_samples_on_reaction_id", using: :btree
  add_index "reactions_reactant_samples", ["sample_id"], name: "index_reactions_reactant_samples_on_sample_id", using: :btree

  create_table "reactions_starting_material_samples", force: :cascade do |t|
    t.integer  "reaction_id"
    t.integer  "sample_id"
    t.boolean  "reference"
    t.float    "equivalent"
    t.datetime "deleted_at"
  end

  add_index "reactions_starting_material_samples", ["deleted_at"], name: "index_reactions_starting_material_samples_on_deleted_at", using: :btree
  add_index "reactions_starting_material_samples", ["reaction_id"], name: "index_reactions_starting_material_samples_on_reaction_id", using: :btree
  add_index "reactions_starting_material_samples", ["sample_id"], name: "index_reactions_starting_material_samples_on_sample_id", using: :btree

  create_table "residues", force: :cascade do |t|
    t.integer  "sample_id"
    t.string   "residue_type"
    t.hstore   "custom_info"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
  end

  add_index "residues", ["sample_id"], name: "index_residues_on_sample_id", using: :btree

  create_table "samples", force: :cascade do |t|
    t.string   "name"
    t.float    "target_amount_value", default: 0.0
    t.string   "target_amount_unit",  default: "g"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.text     "description",         default: ""
    t.integer  "molecule_id"
    t.binary   "molfile"
    t.float    "purity",              default: 1.0
    t.string   "solvent",             default: ""
    t.string   "impurities",          default: ""
    t.string   "location",            default: ""
    t.boolean  "is_top_secret",       default: false
    t.string   "ancestry"
    t.string   "external_label",      default: ""
    t.text     "analyses_dump"
    t.integer  "created_by"
    t.string   "short_label"
    t.float    "real_amount_value"
    t.string   "real_amount_unit"
    t.string   "imported_readout"
    t.datetime "deleted_at"
    t.string   "sample_svg_file"
    t.integer  "user_id"
    t.string   "identifier"
  end

  add_index "samples", ["deleted_at"], name: "index_samples_on_deleted_at", using: :btree
  add_index "samples", ["identifier"], name: "index_samples_on_identifier", using: :btree
  add_index "samples", ["molecule_id"], name: "index_samples_on_sample_id", using: :btree
  add_index "samples", ["user_id"], name: "index_samples_on_user_id", using: :btree

  create_table "scifinding_credentials", force: :cascade do |t|
    t.string   "username"
    t.string   "encrypted_password"
    t.string   "encrypted_current_token"
    t.string   "encrypted_refreshed_token"
    t.datetime "token_expires_at"
    t.datetime "token_requested_at"
    t.datetime "created_at",                null: false
    t.datetime "updated_at",                null: false
    t.integer  "user_id"
  end

  create_table "scifinding_tags", force: :cascade do |t|
    t.integer  "molecule_id"
    t.integer  "count"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
  end

  create_table "screens", force: :cascade do |t|
    t.string   "description"
    t.string   "name"
    t.string   "result"
    t.string   "collaborator"
    t.string   "conditions"
    t.string   "requirements"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.datetime "deleted_at"
  end

  add_index "screens", ["deleted_at"], name: "index_screens_on_deleted_at", using: :btree

  create_table "screens_wellplates", force: :cascade do |t|
    t.integer  "screen_id"
    t.integer  "wellplate_id"
    t.datetime "deleted_at"
  end

  add_index "screens_wellplates", ["deleted_at"], name: "index_screens_wellplates_on_deleted_at", using: :btree
  add_index "screens_wellplates", ["screen_id"], name: "index_screens_wellplates_on_screen_id", using: :btree
  add_index "screens_wellplates", ["wellplate_id"], name: "index_screens_wellplates_on_wellplate_id", using: :btree

  create_table "users", force: :cascade do |t|
    t.string   "email",                  default: "",                                    null: false
    t.string   "encrypted_password",     default: "",                                    null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,                                     null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet     "current_sign_in_ip"
    t.inet     "last_sign_in_ip"
    t.datetime "created_at",                                                             null: false
    t.datetime "updated_at",                                                             null: false
    t.string   "name"
    t.string   "first_name",                                                             null: false
    t.string   "last_name",                                                              null: false
    t.integer  "samples_created_count"
    t.datetime "deleted_at"
    t.hstore   "counters",               default: {"reactions"=>"0", "wellplates"=>"0"}, null: false
  end

  add_index "users", ["deleted_at"], name: "index_users_on_deleted_at", using: :btree
  add_index "users", ["email"], name: "index_users_on_email", unique: true, using: :btree
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree

  create_table "wellplates", force: :cascade do |t|
    t.string   "name"
    t.integer  "size"
    t.string   "description"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
    t.datetime "deleted_at"
  end

  add_index "wellplates", ["deleted_at"], name: "index_wellplates_on_deleted_at", using: :btree

  create_table "wells", force: :cascade do |t|
    t.integer  "sample_id"
    t.integer  "wellplate_id", null: false
    t.integer  "position_x"
    t.integer  "position_y"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.string   "readout"
    t.string   "additive"
    t.datetime "deleted_at"
  end

  add_index "wells", ["deleted_at"], name: "index_wells_on_deleted_at", using: :btree
  add_index "wells", ["sample_id"], name: "index_wells_on_sample_id", using: :btree
  add_index "wells", ["wellplate_id"], name: "index_wells_on_wellplate_id", using: :btree

end
