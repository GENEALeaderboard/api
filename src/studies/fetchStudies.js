
import { z } from "zod"

const studySchema = z.object({
	prolificid: z
		.string()
		.regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	studyid: z
		.string()
		.regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	sessionid: z
		.string()
		.regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function fetchStudies(client, prolificid, studyid, sessionid) {
	try {
		// Use Zod to validate the received data against the UserSchema
		const result = studySchema.safeParse({ prolificid, studyid, sessionid })

		// Check if the validation is successful
		if (result.success) {
			const filter = {
				status: "started",
				prolific_userid: prolificid,
				prolific_studyid: studyid,
				prolific_sessionid: sessionid,
			}
			const db = client.db("hemvip")

			const result = await db.collection("studies").findOne(filter)

			if (result) {
				delete result._id
				// console.log(result)
				return {
					errors: null,
					success: true,
					data: result,
					msg: "Success to start a study",
				}
			} else {
				return {
					errors: null,
					success: true,
					data: null,
					msg: "Studies not exist with prolificid, studyid, sessionid",
				}
			}
		} else {
			// If validation errors, map them into an object
			let serverErrors = Object.fromEntries(
				result.error?.issues?.map((issue) => [issue.path[0], issue.message]) ||
				[]
			)
			return {
				errors: serverErrors,
				success: false,
				data: null,
				msg: "Failed to parse proflificid, studyid, sessionid",
			}
		}
	} catch (error) {
		return {
			errors: error,
			success: false,
			data: null,
			msg: "Internal server error",
		}
	}
}
