import { responseError, responseFailed, responseSuccess } from "../response"
import { z } from "zod"

const studySchema = z.object({
	prolific_userid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	prolific_studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	prolific_sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function startStudy(request, db, corsHeaders) {
	try {
		const { prolificid: prolific_userid, studyid: prolific_studyid, sessionid: prolific_sessionid } = await request.json()
		const parseResult = studySchema.safeParse({ prolific_userid, prolific_studyid, prolific_sessionid })
		if (!parseResult.success) {
			return responseFailed({}, "Failed to parse prolificid, studyid, sessionid", 400, corsHeaders)
		}

		const study = await db.prepare("SELECT * FROM studies WHERE status = 'new' OR status = 'uncomplete'").first()

		if (!study || study.length === 0) {
			return responseSuccess({ state: "full" }, "All study is complete", corsHeaders)
		}
		console.log("goooo222")

		const res = await db
			.prepare(
				`UPDATE studies
			SET status = 'started', time_start = CURRENT_TIMESTAMP, prolific_userid = ?, prolific_studyid = ?, prolific_sessionid = ?
			WHERE id = ?`
			)
			.bind(prolific_userid, prolific_studyid, prolific_sessionid, study.id)
			.run()
		if (!res) {
			console.log("Response", res)
			return responseFailed({}, "Failed to update study", 404, corsHeaders)
		}

		return responseSuccess({ state: "success", code: study.id }, "Start study success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError({}, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
