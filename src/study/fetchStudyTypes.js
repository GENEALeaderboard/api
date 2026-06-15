import { responseError, responseSuccess } from "../response"

// Lists the distinct study *types* that still have assignable studies
// (status 'new' or 'uncomplete'), so the participant can pick which kind of
// study to be assigned to when more than one type is available.
export async function fetchStudyTypes(request, db, corsHeaders) {
	try {
		const { results } = await db
			.prepare(
				`SELECT type, MIN(name) AS name, COUNT(*) AS count
				FROM studies
				WHERE status = 'new' OR status = 'uncomplete'
				GROUP BY type
				ORDER BY name`
			)
			.all()

		return responseSuccess(results || [], "Fetch study types success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError({}, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
