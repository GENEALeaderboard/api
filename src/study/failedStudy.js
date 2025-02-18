import { responseError, responseFailed, responseSuccess } from "../response"
import { z } from "zod"

const studySchema = z.object({
	prolific_userid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	prolific_studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	prolific_sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function failedStudy(request, db, corsHeaders) {
	try {
		const { prolific_userid, prolific_studyid, prolific_sessionid, studyid, failedAttentionCheck } = await request.json()

		const parseResult = studySchema.safeParse({ prolific_userid, prolific_studyid, prolific_sessionid })

		if (!parseResult.success) {
			parseResult.error.errors.forEach((err) => {
				console.error(`Validation error on ${err.path.join(".")}: ${err.message}`)
			})

			return responseFailed(null, "Failed to parse prolificid, studyid, sessionid", 400, corsHeaders)
		}

		const failed_attention_check = JSON.stringify(failedAttentionCheck)
		const { results: rsFailedUpdate } = await db
			.prepare(
				`UPDATE studies
                SET status = 'failed', failed_attention_check = ?
                WHERE id = ? AND prolific_userid = ? AND prolific_studyid = ? AND prolific_sessionid = ?`
			)
			.bind(failed_attention_check, studyid, prolific_userid, prolific_studyid, prolific_sessionid)
			.run()

		if (!rsFailedUpdate) {
			console.log("Response", rsFailedUpdate)
			return responseFailed(null, "Failed to complete study", 404, corsHeaders)
		}

		return responseSuccess({}, "Your study is uncomplete because of failed attention check", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
