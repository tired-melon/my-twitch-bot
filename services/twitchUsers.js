const userProfileCache = new Map();

async function getProfilePic(apiClient, userId) {
    if (!userId) return;

    if (userProfileCache.has(userId)) {
        return userProfileCache.get(userId);
    }

    const user = await apiClient.users.getUserById(userId);
    if (!user) return;

    const picUrl = user.profilePictureUrl;
    userProfileCache.set(userId, picUrl);
    return picUrl;
}

module.exports = { getProfilePic };