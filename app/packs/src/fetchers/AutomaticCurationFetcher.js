import 'whatwg-fetch';
import uuid from 'uuid';
import { read, utils, writeFile } from 'xlsx';

var uid = uuid.v4()

export default class AutomticCurationFetcher {
    
    static amendFetch(new_word){
        fetch(`http://localhost:3000/api/v1/dictionary/amend?new_word=${new_word}&junk=${uid}`)
    }
    static removeFetch(old_word){
        fetch(`http://localhost:3000/api/v1/dictionary/remove?old_word=${old_word}&junk=${uid}`)
    }
    static saveFetch(new_dictionary){
        fetch(`http://localhost:3000/api/v1/dictionary/save?new_dic=${new_dictionary}&junk=${uid}`)
    }
    static async dictionaryFetch(dictionary_lang, dictionary_affix){
        const res = await fetch(`/typojs/${dictionary_lang}/${dictionary_affix}`)
        return res.text()
    }
    static async fetchBatchData(){
        const res = await fetch(`/published_reaction_description_290824.xlsx`);
        const ab = await res.arrayBuffer();
        const wb = read(ab);
         /* generate array of objects from first worksheet */
        const ws = wb.Sheets[wb.SheetNames[0]]; // get the first worksheet
        const data = utils.sheet_to_json(ws); // generate objects
       return data
    }
    static async fetchGrammar(data) {
        console.log(data)
        const response = await fetch(
            "https://api-inference.huggingface.co/models/pszemraj/flan-t5-large-grammar-synthesis",
            {
                headers: {
                    Authorization: "Bearer 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",
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(`${data}`),
            }
        );
        const result = await response.json();
	    return result;
    
    
}

}
