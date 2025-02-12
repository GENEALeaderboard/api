import { z } from "zod"
import * as Realm from 'realm-web';
import {
	toError,
	addCORS,
	responseError,
	responseJSON,
} from "./utils"
import { startStudy } from "./studies/startStudy";
import { fetchStudies } from "./studies/fetchStudies";
import { handleOptions } from "./handleOptions"
import { finishStudy } from "./studies/finishStudy";
import { updateAttentionCheck } from "./studies/updateAttentionCheck";

let App;
const ObjectId = Realm.BSON.ObjectID;

export default {
	async fetch(request, env, ctx) {
		if (request.method === "OPTIONS") {
			// Handle CORS preflight requests
			return handleOptions(request);
		}

		const url = new URL(request.url);
		App = App || new Realm.App(env.ATLAS_APPID);
		const method = request.method;
		const path = url.pathname.replace(/[/]$/, '');

		if (path !== '/api/studies' && path !== '/api/study/finish' && path !== '/api/attention-check') {
			return responseError(`Unknown '${path}' URL; try '/api/studies' instead.`, 404);
		}

		// const token = request.headers.get('authorization');
		const token = "XnabV4Pa2RV6lgyJAj0uAun6X5KM6p0yJceHEm3EJ80757sasEjpP2smYNJaSkcv"
		if (!token)
			return responseError(`Missing 'authorization' header; try to add the header 'authorization: ATLAS_APP_API_KEY'.`);
		try {
			const credentials = Realm.Credentials.apiKey(token);
			// Attempt to authenticate
			var user = await App.logIn(credentials);
			var client = user.mongoClient('mongodb-atlas');
		}
		catch (err) {
			return responseError('Error with authentication.', 500);
		}

		try {
			// console.log("path", path)
			// GET /api/studies
			if (path === '/api/studies' && method === 'GET') {
				console.log("FETCH STUDY")
				const prolificid = url.searchParams.get('prolificid') || '';
				const studyid = url.searchParams.get('studyid') || '';
				const sessionid = url.searchParams.get('sessionid') || '';

				// console.log("prolificid", prolificid, "studyid", studyid, "sessionid", sessionid)

				const { errors, success, data, msg } = await fetchStudies(client, prolificid, studyid, sessionid)
				// console.log(errors, success, data, msg)
				return responseJSON({ errors, success, data, msg })
			}

			// POST /api/studies
			if (path === '/api/studies' && method === 'POST') {
				console.log("START STUDY")
				const { prolificid, studyid, sessionid } = await request.json();

				const { errors, success, data, msg } = await startStudy(client, prolificid, studyid, sessionid)

				return responseJSON({ errors, success, data, msg })
			}

			// POST /api/studies/finish
			if (path === '/api/study/finish' && method === 'POST') {
				console.log("FINISH STUDY API")
				const {
					prolificid,
					studyid,
					sessionid,
					actions,
					screenActions,
					studySelections,
					code
				} = await request.json()

				const { errors, success, data, msg } = await finishStudy(client, prolificid,
					studyid,
					sessionid,
					actions,
					screenActions,
					studySelections,
					code)

				return responseJSON({ errors, success, data, msg })
			}

			if (path === '/api/attention-check' && method === 'POST') {
				console.log("ATTENTION CHECK")
				const {
					prolificid,
					studyid,
					sessionid
				} = await request.json()

				const { errors, success, data, msg } = await updateAttentionCheck(client, prolificid,
					studyid,
					sessionid)

				return responseJSON({ errors, success, data, msg })
			}

			// unknown method
			return responseError('Method not allowed.', 405);
		}
		catch (err) {
			console.log(err)
			return responseError({
				errors: err,
				success: false,
				data: null,
				msg: "Internal server error",
			})
		}
	},

};
