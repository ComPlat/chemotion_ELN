import 'whatwg-fetch';

export default class UserSettingsFetcher {

    static async getAutoCompleteSuggestions(type) {
        return await fetch(
            `/api/v1/user_settings/affiliations/${type}`
        ).then((response) => response.json())
            .then((data) => data)
            .catch((error) => {
                console.log(error);
            });

    }

    static async getAllAffiliations() {
        return await fetch(
            '/api/v1/user_settings/affiliations/all'
        ).then((response) => response.json())
            .then((data) => data)
            .catch((error) => {
                console.log(error);
            });

    }

    static async createAffiliation(params) {
        return await fetch(
            '/api/v1/user_settings/affiliations/create', {
            credentials: 'same-origin',
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        }).then((response) => response.json())
            .then((data) => data)
            .catch((error) => {
                console.log(error);
            });

    }

    static updateAffiliation(params) {

        return fetch(`/api/v1/user_settings/affiliations/update`, {
            credentials: 'same-origin',
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })
            .then((response) => response.json())
            .then((json) => json)
            .catch((errorMessage) => {
                console.log(errorMessage);
            });
    }

    static deleteAffiliation(id) {
        return fetch(`/api/v1/user_settings/affiliations/${id}`, {
            credentials: 'same-origin',
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    }

}
