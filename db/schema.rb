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

ActiveRecord::Schema.define(version: 20150817200859) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "collections", force: :cascade do |t|
    t.integer  "user_id",                                null: false
    t.string   "ancestry"
    t.text     "label",                                  null: false
    t.integer  "shared_by_id"
    t.boolean  "is_shared",              default: false
    t.integer  "permission_level",       default: 0
    t.integer  "sample_detail_level",    default: 0
    t.integer  "reaction_detail_level",  default: 0
    t.integer  "wellplate_detail_level", default: 0
    t.datetime "created_at",                             null: false
    t.datetime "updated_at",                             null: false
  end

  add_index "collections", ["ancestry"], name: "index_collections_on_ancestry", using: :btree
  add_index "collections", ["user_id"], name: "index_collections_on_user_id", using: :btree

  create_table "collections_reactions", id: false, force: :cascade do |t|
    t.integer "collection_id", null: false
    t.integer "reaction_id",   null: false
  end

  add_index "collections_reactions", ["collection_id"], name: "index_collections_reactions_on_collection_id", using: :btree
  add_index "collections_reactions", ["reaction_id"], name: "index_collections_reactions_on_reaction_id", using: :btree

  create_table "collections_samples", id: false, force: :cascade do |t|
    t.integer "collection_id", null: false
    t.integer "sample_id",     null: false
  end

  add_index "collections_samples", ["collection_id"], name: "index_collections_samples_on_collection_id", using: :btree
  add_index "collections_samples", ["sample_id"], name: "index_collections_samples_on_sample_id", using: :btree

  create_table "molecules", force: :cascade do |t|
    t.integer  "sample_id"
    t.string   "inchikey"
    t.string   "inchistring"
    t.float    "density"
    t.float    "molecular_weight"
    t.binary   "molfile"
    t.float    "melting_point"
    t.float    "boiling_point"
    t.string   "sum_formular"
    t.string   "names",             default: [],              array: true
    t.string   "iupac_name"
    t.string   "molecule_svg_file"
    t.datetime "created_at",                     null: false
    t.datetime "updated_at",                     null: false
  end

  add_index "molecules", ["inchikey"], name: "index_molecules_on_inchikey", unique: true, using: :btree

  create_table "reactions", force: :cascade do |t|
    t.string   "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "reactions_product_samples", id: false, force: :cascade do |t|
    t.integer "reaction_id", null: false
    t.integer "sample_id",   null: false
  end

  add_index "reactions_product_samples", ["reaction_id"], name: "index_reactions_product_samples_on_reaction_id", using: :btree
  add_index "reactions_product_samples", ["sample_id"], name: "index_reactions_product_samples_on_sample_id", using: :btree

  create_table "reactions_reactant_samples", id: false, force: :cascade do |t|
    t.integer "reaction_id", null: false
    t.integer "sample_id",   null: false
  end

  add_index "reactions_reactant_samples", ["reaction_id"], name: "index_reactions_reactant_samples_on_reaction_id", using: :btree
  add_index "reactions_reactant_samples", ["sample_id"], name: "index_reactions_reactant_samples_on_sample_id", using: :btree

  create_table "reactions_starting_material_samples", id: false, force: :cascade do |t|
    t.integer "reaction_id", null: false
    t.integer "sample_id",   null: false
  end

  add_index "reactions_starting_material_samples", ["reaction_id"], name: "index_reactions_starting_material_samples_on_reaction_id", using: :btree
  add_index "reactions_starting_material_samples", ["sample_id"], name: "index_reactions_starting_material_samples_on_sample_id", using: :btree

  create_table "samples", force: :cascade do |t|
    t.string   "name"
    t.float    "amount_value"
    t.string   "amount_unit"
    t.datetime "created_at",                null: false
    t.datetime "updated_at",                null: false
    t.text     "description",  default: ""
  end

  create_table "users", force: :cascade do |t|
    t.string   "email",                  default: "", null: false
    t.string   "encrypted_password",     default: "", null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet     "current_sign_in_ip"
    t.inet     "last_sign_in_ip"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
  end

  add_index "users", ["email"], name: "index_users_on_email", unique: true, using: :btree
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree

end
