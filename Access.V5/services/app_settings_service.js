// your-project-name/src/services/app_settings_service.js
const { getApplicationSetting, setApplicationSetting } = require('../db/database');
const { logError, logWarn } = require('../utils/logging'); // Using logWarn here for non-critical issues

/**
 * Retrieves all dashboard-related welcome message settings.
 * @returns {Promise<{message: string, tagline: string, title: string}>} An object containing the welcome message, tagline, and app title.
 */
async function getWelcomeMessageSettings() {
    const message = await getApplicationSetting('welcome_message', 'Welcome to the Dashboard!');
    const tagline = await getApplicationSetting('tagline', 'Manage your service with Discord.');
    const title = await getApplicationSetting('app_title', 'Enhanced Private System'); // Updated default title
    return { message, tagline, title };
}

/**
 * Retrieves the currently active theme setting for the dashboard.
 * @returns {Promise<string>} The name of the current theme (e.g., 'default-theme', 'light-theme').
 */
async function getThemeSetting() {
    return await getApplicationSetting('theme', 'default-theme');
}

/**
 * Retrieves a list of currently enabled features for the dashboard.
 * These are stored as a JSON array in the database.
 * @returns {Promise<Array<{id: string, name: string}>>} An array of enabled feature objects.
 */
async function getEnabledFeatures() {
    const featuresJson = await getApplicationSetting('enabled_features', '[]');
    try {
        // Ensure the stored value is parsed correctly from JSON string to object
        return typeof featuresJson === 'string' ? JSON.parse(featuresJson) : featuresJson;
    } catch (e) {
        logError('Error parsing enabled_features from DB. Returning empty array.', e);
        return [];
    }
}

/**
 * Retrieves the current system announcement message.
 * @returns {Promise<string>} The current announcement message.
 */
async function getAnnouncementMessage() {
    return await getApplicationSetting('announcement_message', 'No important system announcement at this time.');
}


/**
 * Adds a new feature to the list of enabled features.
 * @param {string} featureId A unique identifier for the feature.
 * @param {string} featureName A user-friendly name for the feature.
 * @returns {Promise<boolean>} True if the feature was added (or already existed), false on error.
 */
async function addEnabledFeature(featureId, featureName) {
    const currentFeatures = await getEnabledFeatures();
    if (currentFeatures.some(f => f.id === featureId)) {
        logWarn(`Feature with ID '${featureId}' already exists. Not adding.`);
        return true; // Consider it a success if it's already there
    }
    currentFeatures.push({ id: featureId, name: featureName });
    return setApplicationSetting('enabled_features', currentFeatures);
}

/**
 * Removes a feature from the list of enabled features.
 * @param {string} featureId The unique identifier of the feature to remove.
 * @returns {Promise<boolean>} True if the feature was removed, false if not found or on error.
 */
async function removeEnabledFeature(featureId) {
    const currentFeatures = await getEnabledFeatures();
    const updatedFeatures = currentFeatures.filter(f => f.id !== featureId);
    if (updatedFeatures.length === currentFeatures.length) {
        logWarn(`Feature with ID '${featureId}' not found. Cannot remove.`);
        return false; // Feature not found
    }
    return setApplicationSetting('enabled_features', updatedFeatures);
}


module.exports = {
    getWelcomeMessageSettings,
    getThemeSetting,
    getEnabledFeatures,
    getAnnouncementMessage, // Export the new function
    addEnabledFeature,
    removeEnabledFeature,
    setApplicationSetting, // Also expose general setting function if needed elsewhere
};
