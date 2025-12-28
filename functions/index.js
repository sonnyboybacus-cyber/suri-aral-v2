const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Deletes a user from Firebase Authentication.
 * Callable from the client app.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
    // 1. Authenticate Request
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const callerUid = context.auth.uid;
    const targetUid = data.uid;

    if (!targetUid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with one argument 'uid' containing the user UID to delete."
        );
    }

    // 2. Authorization: Verify caller is admin
    // We check the Realtime Database for the user's role
    try {
        const callerSnapshot = await admin.database().ref(`users/${callerUid}/profile/role`).once('value');
        const role = callerSnapshot.val();

        if (role !== 'admin') {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Only admins can delete users."
            );
        }

        // 3. Execution: Delete the user from Authentication
        await admin.auth().deleteUser(targetUid);

        // Optionally clean up database (already handled by client but good to be redundant or if we move logic here)
        // For now, let's just return success and let client handle DB cleanup to match existing pattern.

        return { success: true, message: `Successfully deleted user ${targetUid}` };

    } catch (error) {
        console.error("Error deleting user:", error);
        // Rethrow valid HttpsErrors
        if (error.code && error.code.startsWith('functions/')) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Unable to delete user.", error);
    }
});
