import { responseError, responseFailed, responseSuccess } from "../response"
import { z } from "zod"

const studySchema = z.object({
	prolific_userid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	prolific_studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	prolific_sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function finishStudy(request, db, corsHeaders) {
	try {
		const { prolific_userid, prolific_studyid, prolific_sessionid, studyid, global_actions, screenActions, studySelections, juiceOptions, juiceOtherReason } =
			await request.json()

		const parseResult = studySchema.safeParse({ prolific_userid, prolific_studyid, prolific_sessionid })

		if (!parseResult.success) {
			parseResult.error.errors.forEach((err) => {
				console.error(`Validation error on ${err.path.join(".")}: ${err.message}`)
			})

			return responseFailed(null, "Failed to parse prolificid, studyid, sessionid", 400, corsHeaders)
		}

		const json_global_actions = JSON.stringify(global_actions)
		const { results: updateStudyResp } = await db
			.prepare(
				`UPDATE studies
                SET status = 'finish', global_actions = ?
                WHERE id = ? AND prolific_userid = ? AND prolific_studyid = ? AND prolific_sessionid = ?`
			)
			.bind(json_global_actions, studyid, prolific_userid, prolific_studyid, prolific_sessionid)
			.run()

		if (!updateStudyResp) {
			console.log("Response", updateStudyResp)
			return responseFailed(null, "Failed to complete study", 404, corsHeaders)
		}

		// ***************************
		const stmtActions = db.prepare(`UPDATE pages SET actions = ? WHERE id = ? AND studyid = ?`)
		const batchActions = Object.entries(screenActions).map(([pageid, actions]) => {
			const json_screenActions = JSON.stringify(actions)
			return stmtActions.bind(json_screenActions, pageid, studyid)
		})

		const respActions = await db.batch(batchActions)

		if (!respActions || !respActions.every(result => result.success)) {
            console.log("respActions", respActions);
            return responseFailed(null, "Failed to update actions on pages", 404, corsHeaders);
        }

		// ***************************
		const stmtSelect = db.prepare(`UPDATE pages SET selected = ? WHERE id = ? AND studyid = ?`)
		const batchSelect = Object.entries(studySelections).map(([id, select]) => {
			const json_screenSelect = JSON.stringify(select)
			return stmtSelect.bind(json_screenSelect, id, studyid)
		})

		const respSelect = await db.batch(batchSelect)
		if (!respSelect || !respSelect.every((result) => result.success)) {
			console.log("respSelect", respSelect)
			return responseFailed(null, "Failed to update selected on pages", 404, corsHeaders)
		}

		// ***************************
		const stmtJuice = db.prepare(`UPDATE pages SET juiceOptions = ? WHERE id = ? AND studyid = ?`)
		const batchJuice = Object.entries(juiceOptions).map(([id, juice]) => {
			const json_screenJuice = JSON.stringify(juice)
			return stmtJuice.bind(json_screenJuice, id, studyid)
		})

		const respJuice = await db.batch(batchJuice)
		if (!respJuice || !respJuice.every((result) => result.success)) {
			console.log("respJuice", respJuice)
			return responseFailed(null, "Failed to update juiceOptions on pages", 404, corsHeaders)
		}

		// ***************************
		const stmtJuiceOther = db.prepare(`UPDATE pages SET juiceOtherReason = ? WHERE id = ? AND studyid = ?`)
		const batchJuiceOther = Object.entries(juiceOtherReason).map(([id, juice]) => {
			const json_screenJuiceOther = JSON.stringify(juice)
			return stmtJuiceOther.bind(json_screenJuiceOther, id, studyid)
		})
		
		const respJuiceOther = await db.batch(batchJuiceOther)
		if (!respJuiceOther || !respJuiceOther.every((result) => result.success)) {
			console.log("respJuiceOther", respJuiceOther)
			return responseFailed(null, "Failed to update juiceOtherReason on pages", 404, corsHeaders)
		}

		return responseSuccess({}, "Finish the study success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
